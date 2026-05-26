// reusable avatar — shows image if available, falls back to initial

interface AvatarProps {
  name?: string | null;
  avatarBase64?: string | null;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

const SIZE = {
  sm: 'w-7 h-7 text-[10px]',
  md: 'w-8 h-8 text-xs',
  lg: 'w-20 h-20 text-2xl',
  xl: 'w-24 h-24 text-3xl',
};

export function Avatar({ name, avatarBase64, size = 'md' }: AvatarProps) {
  const initial   = name?.charAt(0).toUpperCase() ?? '?';
  const sizeClass = SIZE[size];

  if (avatarBase64) {
    return (
      <img
        src={avatarBase64}
        alt={name ?? 'User avatar'}
        className={`${sizeClass} rounded-full object-cover border border-accent-blue/30 flex-shrink-0`}
      />
    );
  }

  return (
    <div
      className={`${sizeClass} rounded-full bg-gradient-to-br from-accent-blue/40 to-accent-blue/10 border border-accent-blue/40 flex items-center justify-center flex-shrink-0`}
    >
      <span className="font-mono text-accent-blue font-bold">{initial}</span>
    </div>
  );
}