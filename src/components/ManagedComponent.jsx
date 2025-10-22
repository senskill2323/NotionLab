import React from 'react';
import { useComponentState } from '@/contexts/ComponentStateContext';
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

const ManagedComponent = ({ componentKey, children, as, disabledTooltip, ...props }) => {
  const { getComponentState } = useComponentState();
  const state = getComponentState(componentKey);

  if (state === 'hidden') {
    return null;
  }

  const isActuallyDisabled = state === 'disabled';
  const existingStyle = (children && children.props && children.props.style) ? children.props.style : undefined;
  const disabledStyle = isActuallyDisabled
    ? {
        pointerEvents: 'none',
        opacity: existingStyle && typeof existingStyle.opacity !== 'undefined' ? existingStyle.opacity : 0.6,
      }
    : undefined;

  const clonedChild = React.cloneElement(children, {
    ...(props || {}),
    ...(isActuallyDisabled ? { 'aria-disabled': true, tabIndex: -1 } : {}),
    ...(disabledStyle
      ? { style: { ...(existingStyle || {}), ...disabledStyle } }
      : { style: existingStyle }),
  });

  if (isActuallyDisabled && disabledTooltip) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <span>{clonedChild}</span>
        </TooltipTrigger>
        <TooltipContent>
          <p>{disabledTooltip}</p>
        </TooltipContent>
      </Tooltip>
    );
  }

  return clonedChild;
};

export default ManagedComponent;
