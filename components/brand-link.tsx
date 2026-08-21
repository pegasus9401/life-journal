import Link from "next/link";

type BrandLinkProps = {
  label?: string;
  title?: string;
};

export function BrandLink({ label = "Начало на Дневник на живота", title = "Дневник на живота" }: BrandLinkProps) {
  return (
    <Link className="brand" href="/" aria-label={label}>
      <span className="brand-mark" aria-hidden="true">LJ</span>
      <span>{title}</span>
    </Link>
  );
}
