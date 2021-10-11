import {
  AnimationType,
  ReactZoomPanPinchContext,
  StateType,
} from "../../models";

export  animate= useCallback((
  contextInstance: ReactZoomPanPinchContext,
  targetState: StateType,
  animationTime: number,
  animationName: string,
): void =>{
  const isValid = isValidTargetState(targetState);
  if (!contextInstance.mounted || !isValid) return;
  const { setTransformState } = contextInstance;
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
    handleSetupAnimation(
      contextInstance,
      animationName,
      animationTime,
      (step: number) => {
        const newScale = scale + scaleDiff * step;
        const newPositionX = positionX + positionXDiff * step;
        const newPositionY = positionY + positionYDiff * step;

        setTransformState(newScale, newPositionX, newPositionY);
      },
    );
  }
}, [setupAnimation, setTransformState]);

export  function isValidTargetState(targetState: StateType): boolean {
  const { scale, positionX, positionY } = targetState;

  if (isNaN(scale) || isNaN(positionX) || isNaN(positionY)) {
    return false;
  }

  return true;
}
