'use client';

interface Props extends React.InputHTMLAttributes<HTMLInputElement> {}

export const NumberInput = (props: Props) => {
  return (
    <input
      {...props}
      type="number"
      onWheel={(e) => e.currentTarget.blur()}
      onKeyDown={(e) => (e.key === 'ArrowUp' || e.key === 'ArrowDown') && e.preventDefault()}
      className={`[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none ${props.className}`}
    />
  );
};
