import { useState } from "react";
import { adminSaveProduct } from "@/lib/store";
import { cents } from "@/lib/money";
import { Button } from "@/components/ui/button";
import { Input, Label, Select } from "@/components/ui/field";
import { ChevronRight } from "lucide-react";
import { toast } from "sonner";
import type { Product } from "./types";

export function ProductsBlock({
  products,
  onSave,
}: {
  products: Product[];
  onSave: () => void;
}) {
  const [openId, setOpenId] = useState<number | null>(null);
  const [togglingId, setTogglingId] = useState<number | null>(null);

  async function toggleListed(p: Product, active: boolean) {
    setTogglingId(p.id);
    try {
      await adminSaveProduct({
        data: {
          id: p.id,
          name: p.name,
          sizeLabel: p.sizeLabel,
          category: p.category === "bac_water" ? "bac_water" : "peptide",
          priceDollars: (p.priceCents / 100).toFixed(2),
          stock: p.stock,
          coaUrl: p.coaUrl,
          active,
        },
      });
      toast.success(active ? "Listed on shop" : "Hidden from shop");
      onSave();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not update listing.");
    } finally {
      setTogglingId(null);
    }
  }

  const sortedProducts = [...products].sort((a, b) => {
    if (a.active !== b.active) return a.active ? -1 : 1;
    return a.name.localeCompare(b.name, undefined, { sensitivity: "base" });
  });

  return (
    <section>
      <h1 className="font-display text-[26px] font-medium">Products</h1>
      <p className="mt-1 text-sm text-muted">
        Add a row in under a minute. COA is a link — leave blank until you have one.
      </p>
      <div className="mt-6 rounded-xl border border-border bg-surface p-4">
        <ProductForm onSave={onSave} />
      </div>
      <ul className="mt-4 divide-y divide-border border-y border-border">
        {sortedProducts.map((p) => {
          const open = openId === p.id;
          const sizePart = p.sizeLabel.trim() ? ` ${p.sizeLabel.trim()}` : "";
          const banner = `${p.name}${sizePart} · ${cents(p.priceCents)} · ${p.stock} in stock`;
          return (
            <li key={p.id} className="py-2">
              <div className="flex items-center gap-2 py-2 text-sm">
                <button
                  type="button"
                  className="flex min-w-0 flex-1 items-center gap-2 text-left"
                  aria-expanded={open}
                  onClick={() => setOpenId(open ? null : p.id)}
                >
                  <ChevronRight
                    className={`size-4 shrink-0 text-muted transition-transform duration-150 ${
                      open ? "rotate-90" : ""
                    }`}
                    aria-hidden
                  />
                  <span className="min-w-0 flex-1 truncate font-medium text-fg">{banner}</span>
                </button>
                <label
                  className="flex shrink-0 items-center gap-2 text-muted"
                  onClick={(e) => e.stopPropagation()}
                >
                  <input
                    type="checkbox"
                    checked={p.active}
                    disabled={togglingId === p.id}
                    onChange={(e) => void toggleListed(p, e.target.checked)}
                  />
                  Listed
                </label>
              </div>
              {open ? (
                <div className="pb-4 pl-6">
                  <ProductForm product={p} onSave={onSave} />
                </div>
              ) : null}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function ProductForm({
  product,
  onSave,
}: {
  product?: Product;
  onSave: () => void;
}) {
  const [name, setName] = useState(product?.name ?? "");
  const [sizeLabel, setSizeLabel] = useState(product?.sizeLabel ?? "");
  const [category, setCategory] = useState<"peptide" | "bac_water">(
    product?.category === "bac_water" ? "bac_water" : "peptide",
  );
  const [price, setPrice] = useState(product ? (product.priceCents / 100).toFixed(2) : "");
  const [stock, setStock] = useState(product?.stock ?? 0);
  const [coaUrl, setCoaUrl] = useState(product?.coaUrl ?? "");
  const [active, setActive] = useState(product?.active ?? true);

  async function save() {
    try {
      await adminSaveProduct({
        data: {
          id: product?.id,
          name,
          sizeLabel,
          category,
          priceDollars: price,
          stock,
          coaUrl,
          active,
        },
      });
      toast.success("Saved");
      if (!product) {
        setName("");
        setSizeLabel("");
        setPrice("");
        setStock(0);
        setCoaUrl("");
      }
      onSave();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Save failed");
    }
  }

  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
      <div className="col-span-2 sm:col-span-1">
        <Label>Name</Label>
        <Input value={name} onChange={(e) => setName(e.target.value)} />
      </div>
      <div>
        <Label>Size</Label>
        <Input value={sizeLabel} onChange={(e) => setSizeLabel(e.target.value)} placeholder="5 mg" />
      </div>
      <div>
        <Label>Type</Label>
        <Select value={category} onChange={(e) => setCategory(e.target.value as "peptide" | "bac_water")}>
          <option value="peptide">Peptide</option>
          <option value="bac_water">Bac water</option>
        </Select>
      </div>
      <div>
        <Label>Price USD</Label>
        <Input value={price} onChange={(e) => setPrice(e.target.value)} />
      </div>
      <div>
        <Label>Stock</Label>
        <Input
          type="number"
          value={stock}
          onChange={(e) => setStock(Number(e.target.value))}
        />
      </div>
      <div className="col-span-2 sm:col-span-3">
        <Label>COA link</Label>
        <Input
          value={coaUrl}
          onChange={(e) => setCoaUrl(e.target.value)}
          placeholder="https://…  (optional)"
        />
      </div>
      <label className="flex items-center gap-2 text-sm text-muted">
        <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} />
        Listed
      </label>
      <Button type="button" onClick={() => void save()}>
        {product ? "Update" : "Add product"}
      </Button>
    </div>
  );
}
