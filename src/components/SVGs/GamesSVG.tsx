interface GamesSVGProps {
  className?: string;
}

export const GamesSVG = ({ className }: GamesSVGProps) => (
  <svg
    className={className}
    width='32'
    height='32'
    viewBox='0 0 32 32'
    fill='none'
    xmlns='http://www.w3.org/2000/svg'
    aria-hidden='true'
  >
    {/* Octopus head */}
    <ellipse cx='16' cy='13' rx='9' ry='8' fill='#5E6AD2' />
    {/* Eyes */}
    <circle cx='13' cy='11' r='1.8' fill='white' />
    <circle cx='19' cy='11' r='1.8' fill='white' />
    <circle cx='13.5' cy='11.5' r='0.9' fill='#1e1b4b' />
    <circle cx='19.5' cy='11.5' r='0.9' fill='#1e1b4b' />
    {/* Tentacles */}
    <path d='M8 19 Q6 23 8 26 Q9 28 10 26 Q11 24 10 21' stroke='#5E6AD2' strokeWidth='2' strokeLinecap='round' fill='none'/>
    <path d='M11 21 Q10 25 11 28 Q12 30 13 28 Q14 26 13 23' stroke='#5E6AD2' strokeWidth='2' strokeLinecap='round' fill='none'/>
    <path d='M14.5 21.5 Q14 26 15 29 Q16 31 17 29 Q18 27 17 24' stroke='#5E6AD2' strokeWidth='2' strokeLinecap='round' fill='none'/>
    <path d='M18 21 Q18 25 19 28 Q20 30 21 28 Q22 26 21 23' stroke='#5E6AD2' strokeWidth='2' strokeLinecap='round' fill='none'/>
    <path d='M21 19 Q23 23 22 26 Q21 28 20 26 Q19 24 20 21' stroke='#5E6AD2' strokeWidth='2' strokeLinecap='round' fill='none'/>
    {/* Bottom of head blending into tentacles */}
    <ellipse cx='16' cy='20' rx='8' ry='3' fill='#5E6AD2' />
  </svg>
);
