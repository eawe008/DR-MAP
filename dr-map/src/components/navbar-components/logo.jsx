import Image from "next/image";

export default function Logo() {
  return (
    <Image
      src="/medivyne-logo.svg" // path relative to /public
      alt="Medivyne Logo"
      width={33}
      height={33}
      className="h-15 w-15"
    />
  );
}
