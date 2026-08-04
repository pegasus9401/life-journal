import Link from "next/link";

type BrandLinkProps = {
  label?: string;
};

export function BrandLink({ label = "Начало на Дневник на живота" }: BrandLinkProps) {
  return (
    <Link className="brand" href="/" aria-label={label}>
      <span className="brand-mark" aria-hidden="true">LJ</span>
      <span>Дневник на живота</span>
    </Link>
  );
}
