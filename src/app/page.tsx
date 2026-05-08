export default function Page() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 py-12 animate-fade-in">
      <div className="flex w-full max-w-md flex-col items-center gap-6 text-center">
        <StaircaseIcon />
        <h1 className="text-3xl font-bold text-white tracking-tight text-glow">
          SECRET STAIRS
        </h1>
        <p className="text-gray-400 text-sm tracking-wide leading-relaxed">
          You&apos;ve found the secret space between the stairwells.
          <br />
          Linger here a while.
        </p>
        <div className="mt-2 h-px w-24 bg-stairs-blue/40" />
        <p className="text-gray-600 text-xs font-mono tracking-widest">
          something is being built here
        </p>
      </div>
    </div>
  );
}

function StaircaseIcon() {
  return (
    <svg
      width="64"
      height="64"
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="mx-auto opacity-70"
      role="img"
      aria-label="Staircase"
    >
      <rect
        x="4"
        y="36"
        width="12"
        height="8"
        rx="1"
        fill="#0052FF"
        opacity="0.3"
      />
      <rect
        x="14"
        y="28"
        width="12"
        height="16"
        rx="1"
        fill="#0052FF"
        opacity="0.45"
      />
      <rect
        x="24"
        y="20"
        width="12"
        height="24"
        rx="1"
        fill="#0052FF"
        opacity="0.6"
      />
      <rect
        x="34"
        y="12"
        width="10"
        height="32"
        rx="1"
        fill="#0052FF"
        opacity="0.85"
      />
      <rect x="4" y="36" width="40" height="1" fill="#3380FF" opacity="0.3" />
    </svg>
  );
}
