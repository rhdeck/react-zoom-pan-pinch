import React, {
  FC,
  useCallback,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
} from "react";

import {
  BoundsType,
  LibrarySetup,
  PositionType,
  VelocityType,
  AnimationType,
  ReactZoomPanPinchProps,
  ReactZoomPanPinchState,
} from "../models";

import {
  getContext,
  createSetup,
  createState,
  handleCallback,
  makePassiveEventOption,
  getCenterPosition,
} from "../utils";

import { contextInitialState } from "../constants/state.constants";

import { isWheelAllowed } from "../core/wheel/wheel.utils";
import { isPinchAllowed, isPinchStartAllowed } from "../core/pinch/pinch.utils";
import { handleCalculateBounds } from "../core/bounds/bounds.utils";

import {
  handleWheelStart,
  handleWheelZoom,
  handleWheelStop,
} from "../core/wheel/wheel.logic";
import {
  isPanningAllowed,
  isPanningStartAllowed,
} from "../core/pan/panning.utils";
import {
  handlePanning,
  handlePanningEnd,
  handlePanningStart,
} from "../core/pan/panning.logic";
import {
  handlePinchStart,
  handlePinchStop,
  handlePinchZoom,
} from "../core/pinch/pinch.logic";
import {
  handleDoubleClick,
  isDoubleClickAllowed,
} from "../core/double-click/double-click.logic";
import { animations } from "../core/animations/animations.constants";
import { StateType } from "../models/calculations.model";
import { isValidTargetState } from "../core/animations/animations.utils";
type StartCoordsType = { x: number; y: number } | null;

const context = React.createContext(contextInitialState);
const { Provider } = context;
const TransformWrapper: FC<ReactZoomPanPinchProps> = (props) => {
  const setup = useMemo(() => {
    return createSetup(props);
  }, [props]);

  // Components
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  // Initialization
  let isInitialized = false;
  let bounds: BoundsType | null = null;
  // wheel helpers
  let previousWheelEvent: WheelEvent | null = null;
  let wheelStopEventTimer: ReturnType<typeof setTimeout> | null = null;
  let wheelAnimationTimer: ReturnType<typeof setTimeout> | null = null;
  // panning helpers
  const isPanningRef = useRef(false);
  const startCoordsRef = useRef<StartCoordsType>();
  let lastTouch: number | null = null;
  // pinch helpers
  let distance: null | number = null;
  let lastDistance: null | number = null;
  let pinchStartDistance: null | number = null;
  let pinchStartScale: null | number = null;
  let pinchMidpoint: null | PositionType = null;
  // velocity helpers
  let velocity: VelocityType | null = null;
  let velocityTime: number | null = null;
  let lastMousePosition: PositionType | null = null;
  // animations helpers
  let maxBounds: BoundsType | null = null;

  // key press
  const pressedKeys = useRef<{ [key: string]: boolean }>({});

  // componentDidUpdate(oldProps: ReactZoomPanPinchProps): void {
  //   if (oldProps !== props) {
  //     console.log("Running handlecalculatebounds form componetndidupdate");
  //     handleCalculateBounds(this, transformState.scale);
  //     console.log("I ran handlecalculatebounds form componetndidupdate");
  //     setup = createSetup(props);
  //   }
  // }
  //#region Marshal State data into contrext
  const [previousScale, setPreviousScale] = useState<number>(
    Math.max(setup.minScale, Math.max(setup.maxScale, 1)),
  );
  const [scale, _setScale] = useState<number>(
    Math.max(setup.minScale, Math.max(setup.maxScale, 1)),
  );
  const setScale = useCallback((newValue: number) => {
    _setScale((previousScale) => {
      setPreviousScale(previousScale);
      return Math.max(setup.minScale, Math.max(setup.maxScale, newValue));
    });
  }, []);
  const [positionX, setPositionX] = useState<number>(0);
  const [positionY, setPositionY] = useState<number>(0);
  const animationRef = useRef<AnimationType | null>(null);
  const animateRef = useRef<boolean>(false);
  const velocityRef = useRef<number>(0);
  const cancelAnimation = useCallback((): void => {
    if (typeof animationRef.current === "number")
      cancelAnimationFrame(animationRef.current);
    // Clear animation state
    animationRef.current = null;
    animateRef.current = false;
    velocityRef.current = 0;
  }, []);

  const setupAnimation = useCallback(
    (
      animationName: string,
      animationTime: number,
      callback: (step: number) => void,
    ): void => {
      const startTime = new Date().getTime();
      const lastStep = 1;
      cancelAnimation();
      animationRef.current = () => {
        const frameTime = new Date().getTime() - startTime;
        const animationProgress = frameTime / animationTime;
        const animationType = animations[animationName];
        const step = animationType(animationProgress);
        if (frameTime >= animationTime) {
          callback(lastStep);
          animationRef.current = null;
        } else if (animationRef.current) {
          callback(step);
          requestAnimationFrame(animationRef.current);
        }
      };
      requestAnimationFrame(animationRef.current);
    },
    [cancelAnimation],
  );

  const setTransformState = useCallback(
    (scale: number, positionX: number, positionY: number): void => {
      if (!isNaN(scale) && !isNaN(positionX) && !isNaN(positionY)) {
        setScale(scale);
        setPositionX(positionX);
        setPositionY(positionY);
      } else {
        console.error("Detected NaN set state values");
      }
    },
    [],
  );
  const value: ReactZoomPanPinchState = useMemo(
    () => ({
      previousScale,
      scale,
      positionX,
      positionY,
      setTransformState,
    }),
    [previousScale, scale, positionX, positionY, setTransformState],
  );
  const valueRef = useRef(value);
  useEffect(() => {
    valueRef.current = value;
  }, [value]);
  const animate = useCallback(
    (
      targetState: StateType,
      animationTime: number,
      animationName: string,
    ): void => {
      const { scale, positionX, positionY } = valueRef.current;

      const scaleDiff = targetState.scale - scale;
      const positionXDiff = targetState.positionX - positionX;
      const positionYDiff = targetState.positionY - positionY;

      if (animationTime === 0) {
        setTransformState(
          targetState.scale,
          targetState.positionX,
          targetState.positionY,
        );
      } else {
        // animation start timestamp
        setupAnimation(animationName, animationTime, (step: number) => {
          const newScale = scale + scaleDiff * step;
          const newPositionX = positionX + positionXDiff * step;
          const newPositionY = positionY + positionYDiff * step;

          setTransformState(newScale, newPositionX, newPositionY);
        });
      }
    },
    [setupAnimation, setTransformState],
  );

  //#endregion
  //////////
  // Zoom
  //////////

  const onWheelZoom = useCallback(
    (event: WheelEvent): void => {
      const { disabled } = setup;
      if (disabled) return;

      const isAllowed = isWheelAllowed(
        setup.wheel,
        isPanningRef.current,
        event,
      );
      if (!isAllowed) return;

      event.preventDefault();
      event.stopPropagation();

      const keysPressed = isPressingKeys(setup.wheel.activationKeys);
      if (!keysPressed) return;

      cancelAnimation();
      if (typeof props.onWheelStart === "function") props.onWheelStart(event);
      if (typeof props.onZoomStart === "function") props.onZoomStart(event);

      handleWheelZoom(this, event);

      if (typeof props.onWheel === "function") props.onWheel(event);
      if (typeof props.onZoom === "function") props.onZoom(event);

      handleWheelStop(this, event);
    },
    [setup.wheel, setup.disabled, props],
  ); //@TODO FIX

  //////////
  // Pan
  //////////

  const onPanningStart = useCallback((event: MouseEvent | TouchEvent): void => {
    const { disabled } = setup;
    if (disabled) return;

    const isAllowed = isPanningStartAllowed(this, event);
    if (!isAllowed) return;

    const keysPressed = isPressingKeys(setup.panning.activationKeys);
    if (!keysPressed) return;

    event.preventDefault();
    event.stopPropagation();

    cancelAnimation();
    if ((event as TouchEvent).touches) {
      const { positionX, positionY } = valueRef.current;
      isPanningRef.current = true;

      // Panning with mouse
      const x = (event as MouseEvent).clientX;
      const y = (event as MouseEvent).clientY;
      startCoordsRef.current = { x: x - positionX, y: y - positionY };
    } else {
      isPanningRef.current = true;
      const x = (event as MouseEvent).clientX;
      const y = (event as MouseEvent).clientY;
      startCoordsRef.current = { x: x - positionX, y: y - positionY };
    }
    if (typeof props.onPanningStart === "function") props.onPanningStart(event);
  }, []);

  const onPanning = useCallback((event: MouseEvent): void => {
    const { disabled } = setup;
    const { onPanning } = props;

    if (disabled) return;

    const isAllowed = isPanningAllowed();
    if (!isAllowed) return;

    const keysPressed = isPressingKeys(setup.panning.activationKeys);
    if (!keysPressed) return; 

    event.preventDefault();
    event.stopPropagation();

    handlePanning(this, event.clientX, event.clientY);
    handleCallback(getContext(this), event, onPanning);
  }, []);

  const onPanningStop = useCallback((event: MouseEvent | TouchEvent): void => {
    const { onPanningStop } = props;

    if (isPanningRef.current) {
      handlePanningEnd(this);
      handleCallback(getContext(this), event, onPanningStop);
    }
  }, []);

  //////////
  // Pinch
  //////////

  const onPinchStart = useCallback((event: TouchEvent): void => {
    const { disabled } = setup;
    const { onPinchingStart, onZoomStart } = props;

    if (disabled) return;

    const isAllowed = isPinchStartAllowed(this, event);
    if (!isAllowed) return;

    handlePinchStart(this, event);
    hanancelAnimation(this);
    handleCallback(getContext(this), event, onPinchingStart);
    handleCallback(getContext(this), event, onZoomStart);
  }, []);

  const onPinch = useCallback((event: TouchEvent): void => {
    const { disabled } = setup;
    const { onPinching, onZoom } = props;

    if (disabled) return;

    const isAllowed = isPinchAllowed(this);
    if (!isAllowed) return;

    event.preventDefault();
    event.stopPropagation();

    handlePinchZoom(this, event);
    handleCallback(getContext(this), event, onPinching);
    handleCallback(getContext(this), event, onZoom);
  }, []);

  const onPinchStop = useCallback((event: TouchEvent): void => {
    const { onPinchingStop, onZoomStop } = props;

    if (pinchStartScale) {
      handlePinchStop(this);
      handleCallback(getContext(this), event, onPinchingStop);
      handleCallback(getContext(this), event, onZoomStop);
    }
  }, []);

  //////////
  // Touch
  //////////

  const onTouchPanningStart = useCallback((event: TouchEvent): void => {
    const { disabled } = setup;
    const { onPanningStart } = props;

    if (disabled) return;

    const isAllowed = isPanningStartAllowed(this, event);

    if (!isAllowed) return;

    const isDoubleTap = lastTouch && +new Date() - lastTouch < 200;

    if (isDoubleTap && event.touches.length === 1) {
      onDoubleClick(event);
    } else {
      lastTouch = +new Date();

      handleCancelAnimation(this);

      const { touches } = event;

      const isPanningAction = touches.length === 1;
      const isPinchAction = touches.length === 2;

      if (isPanningAction) {
        handleCancelAnimation(this);
        handlePanningStart(this, event);
        handleCallback(getContext(this), event, onPanningStart);
      }
      if (isPinchAction) {
        onPinchStart(event);
      }
    }
  }, []);

  const onTouchPanning = useCallback((event: TouchEvent): void => {
    const { disabled } = setup;
    const { onPanning } = props;

    if (isPanning && event.touches.length === 1) {
      if (disabled) return;

      const isAllowed = isPanningAllowed(this);
      if (!isAllowed) return;

      event.preventDefault();
      event.stopPropagation();

      const touch = event.touches[0];
      handlePanning(this, touch.clientX, touch.clientY);
      handleCallback(getContext(this), event, onPanning);
    } else if (event.touches.length > 1) {
      onPinch(event);
    }
  }, []);

  const onTouchPanningStop = useCallback((event: TouchEvent): void => {
    onPanningStop(event);
    onPinchStop(event);
  }, []);

  //////////
  // Double Click
  //////////

  const onDoubleClick = useCallback((event: MouseEvent | TouchEvent): void => {
    const { disabled } = setup;
    if (disabled) return;

    const isAllowed = isDoubleClickAllowed(this, event);
    if (!isAllowed) return;

    handleDoubleClick(this, event);
  }, []);

  //////////
  // Helpers
  //////////

  const clearPanning = useCallback(
    (event: MouseEvent): void => {
      if (isPanningRef.current) {
        onPanningStop(event);
      }
    },
    [onPanningStop],
  );

  const setKeyPressed = useCallback((e: KeyboardEvent): void => {
    pressedKeys.current[e.key] = true;
  }, []);

  const setKeyUnPressed = useCallback((e: KeyboardEvent): void => {
    pressedKeys.current[e.key] = false;
  }, []);

  const isPressingKeys = useCallback((keys: string[]): boolean => {
    if (!keys.length) {
      return true;
    }
    return Boolean(keys.find((key) => pressedKeys.current[key]));
  }, []);
  useEffect(() => {
    handleCalculateBounds(this, transformState.scale);
  }, []);
  const setRef = useCallback((wrapperComponent: HTMLDivElement): void => {
    wrapperComponent = wrapperComponent;
    handleCalculateBounds(this, transformState.scale);
    handleInitializeWrapperEvents(wrapperComponent);
    handleInitialize();
    handleRef();
    isInitialized = true;
    handleCallback(getContext(this), undefined, props.onInit);
  }, []);

  const { children } = props;
  console.log("I demand a render!!!");
  // #region Connect Event Listeners
  useEffect(() => {
    const passive = makePassiveEventOption();
    // Panning on window to allow panning when mouse is out of component wrapper
    window.removeEventListener("mousedown", onPanningStart, passive);
    window.addEventListener("mousedown", onPanningStart, passive);
    return () => {
      window.removeEventListener("mousedown", onPanningStart, passive);
    };
  }, [onPanningStart]);
  useEffect(() => {
    const passive = makePassiveEventOption();
    // Panning on window to allow panning when mouse is out of component wrapper
    window.removeEventListener("mousemove", onPanning, passive);
    window.addEventListener("mousemove", onPanning, passive);
    return () => {
      window.removeEventListener("mousemove", onPanning, passive);
    };
  }, [onPanning]);
  useEffect(() => {
    const passive = makePassiveEventOption();
    // Panning on window to allow panning when mouse is out of component wrapper

    window.removeEventListener("mouseup", onPanningStop, passive);
    window.addEventListener("mouseup", onPanningStop, passive);

    return () => {
      window.removeEventListener("mouseup", onPanningStop, passive);
    };
  }, [onPanningStop]);
  useEffect(() => {
    const passive = makePassiveEventOption();
    // Panning on window to allow panning when mouse is out of component wrapper
    document.removeEventListener("mouseleave", clearPanning, passive);
    document.addEventListener("mouseleave", clearPanning, passive);
    return () => {
      document.removeEventListener("mouseleave", clearPanning, passive);
    };
  }, [clearPanning]);
  useEffect(() => {
    const passive = makePassiveEventOption();
    // Panning on window to allow panning when mouse is out of component wrapper
    window.removeEventListener("keyup", setKeyUnPressed, passive);
    window.addEventListener("keyup", setKeyUnPressed, passive);
    return () => {
      window.removeEventListener("keyup", setKeyUnPressed, passive);
    };
  }, [setKeyUnPressed]);
  useEffect(() => {
    const passive = makePassiveEventOption();
    window.removeEventListener("keydown", setKeyPressed, passive);
    // Panning on window to allow panning when mouse is out of component wrapper
    window.addEventListener("keydown", setKeyPressed, passive);
    return () => {
      window.removeEventListener("keydown", setKeyPressed, passive);
    };
  }, [setKeyPressed]);
  useEffect(() => {
    const passive = makePassiveEventOption();
    if (wrapperRef.current) {
      wrapperRef.current.addEventListener("wheel", onWheelZoom, passive);
    }
  }, [onWheelZoom]);
  useEffect(() => {
    const passive = makePassiveEventOption();
    if (wrapperRef.current) {
      wrapperRef.current.addEventListener("dblclick", onDoubleClick, passive);
    }
  }, [onDoubleClick]);
  useEffect(() => {
    const passive = makePassiveEventOption();
    if (wrapperRef.current) {
      wrapperRef.current.addEventListener(
        "touchstart",
        onTouchPanningStart,
        passive,
      );
    }
  }, [onTouchPanning]);
  useEffect(() => {
    const passive = makePassiveEventOption();
    if (wrapperRef.current) {
      wrapperRef.current.addEventListener("touchmove", onTouchPanning, passive);
    }
  }, [onTouchPanningStop]);
  useEffect(() => {
    const passive = makePassiveEventOption();
    if (wrapperRef.current) {
      wrapperRef.current.addEventListener(
        "touchend",
        onTouchPanningStop,
        passive,
      );
    }
  }, [onWheelZoom, onDoubleClick, onTouchPanning, onTouchPanningStop]);
  useEffect(() => {
    return () => {
      handleCancelAnimation(valueRef.current);
    };
  }, []);
  //#endregion
  return (
    <div
      ref={wrapperRef}
      className={`react-transform-wrapper ${className}`}
      style={style}
    >
      <Provider value={value}>{children}</Provider>
    </div>
  );
};
