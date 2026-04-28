import React from 'react';

type ExternalLinkProps = {
  children?: React.ReactNode;
  className?: string;
  href: string;
  onClick?: () => void;
  testId?: string;
};

export const ExternalLink = ({
  children,
  className,
  href,
  onClick,
  testId,
}: ExternalLinkProps) => {
  return (
    <a
      data-testid={testId}
      className={className}
      target="_blank"
      rel="noopener noreferrer"
      href={href}
      onClick={onClick}>
      {children}
    </a>
  );
};
