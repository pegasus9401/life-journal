import Link from "next/link";

type BrandLinkProps = {
  label?: string;
};

export function BrandLink({ label = "Life Journal home" }: BrandLinkProps) {
  return (
    <Link className="brand" href="/" aria-label={label}>
      <span className="brand-mark" aria-hidden="true">LJ</span>
      <span>Life Journal</span>
    </Link>
  );
}
