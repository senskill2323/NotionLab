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

  const clonedChild = React.cloneElement(children, {
    disabled: isActuallyDisabled,
    'aria-disabled': isActuallyDisabled,
    ...props,
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