import logo from "@/assets/logo-dishyo.png";

export function Logo({ size = 64, className = "" }: { size?: number; className?: string }) {
  return (
    <img
      src={logo}
      alt="Dishyo"
      width={size}
      height={size}
      className={`rounded-[22%] shadow-card ${className}`}
      style={{ width: size, height: size }}
    />
  );
}
