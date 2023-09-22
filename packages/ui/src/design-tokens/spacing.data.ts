// TODO discuss: split spacing from "sizing" - spacing should refer to margin and padding
export const spacing = {
  $0: '0px',
  $1: '1px',
  $2: '2px',
  $4: '4px',
  $6: '6px',
  $8: '8px',
  $10: '10px',
  $12: '12px',
  $16: '16px',
  $18: '18px',
  $20: '20px',
  $24: '24px',
  $28: '28px',
  $32: '32px',
  $40: '40px',
  $44: '44px',
  $48: '48px',
  $52: '52px',
  $56: '56px',
  $64: '64px',
  $80: '80px',
  $84: '84px',
  $96: '96px',
  // TODO discuss: this spacing should be removed as it's not used by the designers (only for storybook)
  $112: '112px',
  $116: '116px',
  $120: '120px',
  $148: '148px',
  $214: '214px',
  $294: '294px',
  $312: '312px',
  $336: '336px',
  $342: '342px',
  $480: '480px',
  $584: '584px',
  $fill: '100%',
  $auto: 'auto',
  // TODO discuss: renaming to side_drawer_width, as dialog widths are different depending on dialog type
  $dialog: '664px',
} as const;
