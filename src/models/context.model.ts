import React from "react";

import { TransformContext } from "../components/transform-context";
import { animations } from "../core/animations/animations.constants";
import { DeepNonNullable } from "./helpers.model";
import {
  zoomIn,
  zoomToElement,
  centerView,
  resetTransform,
  setTransform,
  zoomOut,
} from "../core/handlers/handlers.logic";

export type ReactZoomPanPinchContext = typeof TransformContext.prototype;

export type ReactZoomPanPinchState = {
  previousScale: number;
  scale: number;
  positionX: number;
  positionY: number;
  setTransformState: (
    scale: number,
    positionX: number,
    positionY: number,
  ) => void;
};

export type ReactZoomPanPinchHandlers = {
  zoomIn: ReturnType<typeof zoomIn>;
  zoomOut: ReturnType<typeof zoomOut>;
  setTransform: ReturnType<typeof setTransform>;
  resetTransform: ReturnType<typeof resetTransform>;
  centerView: ReturnType<typeof centerView>;
  zoomToElement: ReturnType<typeof zoomToElement>;
};

export type ReactZoomPanPinchProps = {
  children?: React.ReactNode | ((ref: ReactZoomPanPinchRef) => React.ReactNode);
  initialScale?: number;
  initialPositionX?: number;
  initialPositionY?: number;
  disabled?: boolean;
  minPositionX?: null | number;
  maxPositionX?: null | number;
  minPositionY?: null | number;
  maxPositionY?: null | number;
  minScale?: number;
  maxScale?: number;
  limitToBounds?: boolean;
  centerZoomedOut?: boolean;
  centerOnInit?: boolean;
  wheel?: {
    step?: number;
    disabled?: boolean;
    wheelDisabled?: boolean;
    touchPadDisabled?: boolean;
    activationKeys?: string[];
    excluded?: string[];
  };
  panning?: {
    disabled?: boolean;
    velocityDisabled?: boolean;
    lockAxisX?: boolean;
    lockAxisY?: boolean;
    activationKeys?: string[];
    excluded?: string[];
  };
  pinch?: {
    step?: number;
    disabled?: boolean;
    excluded?: string[];
  };
  doubleClick?: {
    disabled?: boolean;
    step?: number;
    mode?: "zoomIn" | "zoomOut" | "reset";
    animationTime?: number;
    animationType?: keyof typeof animations;
    excluded?: string[];
  };
  zoomAnimation?: {
    disabled?: boolean;
    size?: number;
    animationTime?: number;
    animationType?: keyof typeof animations;
  };
  alignmentAnimation?: {
    disabled?: boolean;
    sizeX?: number;
    sizeY?: number;
    animationTime?: number;
    velocityAlignmentTime?: number;
    animationType?: keyof typeof animations;
  };
  velocityAnimation?: {
    disabled?: boolean;
    sensitivity?: number;
    animationTime?: number;
    animationType?: keyof typeof animations;
    equalToMove?: boolean;
  };
  onWheelStart?: (event: WheelEvent) => void;
  onWheel?: (event: WheelEvent) => void;
  onWheelStop?: (event: WheelEvent) => void;
  onPanningStart?: (event: TouchEvent | MouseEvent) => void;
  onPanning?: (event: TouchEvent | MouseEvent) => void;
  onPanningStop?: (event: TouchEvent | MouseEvent) => void;
  onPinchingStart?: (event: TouchEvent) => void;
  onPinching?: (event: TouchEvent) => void;
  onPinchingStop?: (event: TouchEvent) => void;
  onZoomStart?: (event: TouchEvent | MouseEvent) => void;
  onZoom?: (event: TouchEvent | MouseEvent) => void;
  onZoomStop?: (event: TouchEvent | MouseEvent) => void;
  onInit?: () => void;
};

export type LibrarySetup = Pick<
  ReactZoomPanPinchProps,
  "minPositionX" | "maxPositionX" | "minPositionY" | "maxPositionY"
> &
  DeepNonNullable<
    Omit<
      ReactZoomPanPinchProps,
      | "ref"
      | "initialScale"
      | "initialPositionX"
      | "initialPositionY"
      | "minPositionX"
      | "maxPositionX"
      | "minPositionY"
      | "maxPositionY"
      | "children"
      | "defaultPositionX"
      | "defaultPositionY"
      | "defaultScale"
      | "wrapperClass"
      | "contentClass"
      | "onWheelStart"
      | "onWheel"
      | "onWheelStop"
      | "onPanningStart"
      | "onPanning"
      | "onPanningStop"
      | "onPinchingStart"
      | "onPinching"
      | "onPinchingStop"
      | "onZoomStart"
      | "onZoom"
      | "onZoomStop"
      | "onInit"
    >
  >;
