import { AtlasMark } from "./atlas-mark";

/** Shared Atlas-branded backdrop for every unauthenticated screen (login, forgot/reset password) — screen 15. */
export function AuthShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[var(--color-sunk)] px-10 py-16">
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-[90px] -right-[60px] h-[515px] w-[520px] text-[var(--color-bg)]"
      >
        <AtlasMark className="h-full w-full" />
      </div>
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage: "radial-gradient(rgba(12,33,57,.09) 1px, transparent 1px)",
          backgroundSize: "22px 22px",
          WebkitMaskImage: "radial-gradient(50% 45% at 50% 40%, #000 0%, transparent 100%)",
          maskImage: "radial-gradient(50% 45% at 50% 40%, #000 0%, transparent 100%)",
        }}
      />
      <div className="relative flex flex-col items-center gap-7">
        <div role="img" aria-label="Atlas by Reign" className="flex items-center gap-2.5 text-[var(--color-ink)]">
          <AtlasMark className="h-10 w-10" />
          <span className="mt-0.5 text-[40px] font-normal leading-none tracking-[-0.02em]">Atlas</span>
        </div>
        {children}
      </div>
    </div>
  );
}
