// The shared controls are 28-32px high. On touch screens (coarse pointer) each target grows to 44px.

export const AI_FORM_TOUCH_BUTTON = 'pointer-coarse:h-11'

export const AI_FORM_TOUCH_ICON_BUTTON = 'pointer-coarse:size-11'

export const AI_FORM_TOUCH_INPUT = 'pointer-coarse:h-11'

/** For controls whose label may wrap (links, toggles, action buttons): 44px as a floor, not a fixed height. */
export const AI_TOUCH_MIN_HEIGHT = 'pointer-coarse:min-h-11'

/** For short text-only buttons ("Đổi"): a 44px width floor next to the 44px height. */
export const AI_TOUCH_MIN_WIDTH = 'pointer-coarse:min-w-11'

export const AI_FORM_TOUCH_SELECT = 'pointer-coarse:[&_select]:h-11'

/** Wraps a `DatePickerField`: its trigger is 32px high and only grows to 44px in the time variant. */
export const AI_FORM_TOUCH_DATE = 'pointer-coarse:[&_button]:h-11'

/** Wraps a `LookupCombobox`: the group, its toggle and its clear button all reach 44px. */
export const AI_FORM_TOUCH_COMBOBOX =
  'pointer-coarse:[&_[data-slot=input-group]]:h-11 pointer-coarse:[&_[data-slot=input-group-button]]:size-11 pointer-coarse:[&_[data-slot=combobox-clear]]:size-11'
