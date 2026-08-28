import Link from "next/link";
import Image from "next/image";
import { Cookie } from "lucide-react";

import { AdminTable, FilterTabs, SearchForm, Td } from "@/components/admin/admin-ui";
import { ActionButton } from "@/components/admin/action-controls";
import { InstagramImport } from "@/components/admin/instagram-import";
import {
  Badge,
  Card,
  EmptyState,
  PageHeader,
  Pagination,
} from "@/components/ui/primitives";
import { ButtonLink } from "@/components/ui/button";
import { setProductActiveAction } from "@/app/actions/catalog";
import { requireAdmin } from "@/lib/auth/require-admin";
import { getAdminCategories, getAdminProducts } from "@/lib/data/admin";
import { getProductPoster } from "@/lib/products/display";
import { formatCurrency } from "@/lib/utils";

export const dynamic = "force-dynamic";

export const metadata = { title: "Products" };

const STATUS_OPTIONS = [
  { label: "All", value: "all" },
  { label: "Active", value: "active" },
  { label: "Archived", value: "archived" },
];

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; search?: string; page?: string; category?: string }>;
}) {
  const { supabase } = await requireAdmin();
  const params = await searchParams;

  const page = Number(params.page ?? "1") || 1;
  const status = params.status ?? "all";

  const [{ rows, total, pageCount }, categories] = await Promise.all([
    getAdminProducts(supabase, {
      page,
      status,
      search: params.search,
      categoryId: params.category,
    }),
    getAdminCategories(supabase),
  ]);

  return (
    <>
      <PageHeader
        title="Products"
        description={`${total} product${total === 1 ? "" : "s"} in this view.`}
        action={
          <>
            <InstagramImport categories={categories} />
            <ButtonLink href="/admin/products/new" variant="admin">
              Add product
            </ButtonLink>
          </>
        }
      />

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <FilterTabs
          options={STATUS_OPTIONS}
          active={status}
          basePath="/admin/products"
          extraParams={{ search: params.search, category: params.category }}
        />
        <SearchForm
          action="/admin/products"
          defaultValue={params.search}
          placeholder="Search name or code"
          hiddenFields={{
            status: status !== "all" ? status : undefined,
            category: params.category,
          }}
        />
      </div>

      {categories.length > 0 ? (
        <FilterTabs
          options={[
            { label: "All categories", value: "all" },
            ...categories.map((category) => ({ label: category.name, value: category.id })),
          ]}
          active={params.category ?? "all"}
          basePath="/admin/products"
          paramName="category"
          extraParams={{
            status: status !== "all" ? status : undefined,
            search: params.search,
          }}
        />
      ) : null}

      {rows.length === 0 ? (
        <EmptyState
          title="No products here"
          description="Add your first treat and it will appear on the website straight away."
          icon={<Cookie className="size-6" aria-hidden="true" />}
          action={
            <ButtonLink href="/admin/products/new" variant="admin">
              Add product
            </ButtonLink>
          }
        />
      ) : (
        <Card className="flex flex-col gap-4 p-0">
          <AdminTable
            headers={["", "Product", "Category", "Price", "Flags", "Status", ""]}
            caption="Products"
          >
            {rows.map((product) => {
              const poster = getProductPoster(product);
              return (
                <tr key={product.id} className="hover:bg-admin-bg/50">
                  <Td>
                    <span className="relative block size-11 overflow-hidden rounded-lg bg-admin-bg">
                      {poster?.url ? (
                        <Image
                          src={poster.url}
                          alt=""
                          fill
                          sizes="44px"
                          className="object-cover"
                        />
                      ) : null}
                    </span>
                  </Td>
                  <Td>
                    <span className="font-medium">{product.name}</span>
                    <span className="block font-mono text-xs text-admin-muted">
                      {product.sku}
                    </span>
                  </Td>
                  <Td className="text-admin-muted">{product.category?.name ?? "-"}</Td>
                  <Td className="whitespace-nowrap tabular-nums">
                    {product.starting_price === null
                      ? "On enquiry"
                      : formatCurrency(product.starting_price)}
                  </Td>
                  <Td>
                    <div className="flex flex-wrap gap-1">
                      {product.is_bestseller ? <Badge tone="cocoa">Bestseller</Badge> : null}
                      {product.available_today ? <Badge tone="accent">Today</Badge> : null}
                      {product.is_sugar_free ? <Badge tone="sage">Sugar-free</Badge> : null}
                      {product.media.length === 0 ? (
                        <Badge tone="warning">No photo</Badge>
                      ) : null}
                    </div>
                  </Td>
                  <Td>
                    {product.is_active ? (
                      <Badge tone="success">Active</Badge>
                    ) : (
                      <Badge tone="neutral">Archived</Badge>
                    )}
                  </Td>
                  <Td>
                    <div className="flex items-center gap-2">
                      <Link
                        href={`/admin/products/${product.id}`}
                        className="whitespace-nowrap text-xs font-semibold text-admin-accent hover:underline"
                      >
                        Edit
                      </Link>
                      <ActionButton
                        variant="adminGhost"
                        size="sm"
                        action={setProductActiveAction.bind(
                          null,
                          product.id,
                          !product.is_active,
                        )}
                        successMessage={
                          product.is_active ? "Product archived." : "Product restored."
                        }
                        confirm={
                          product.is_active
                            ? "Archive this product? It will be hidden from the website but kept in your records and past orders."
                            : undefined
                        }
                        confirmTitle="Archive product"
                        confirmLabel="Archive"
                      >
                        {product.is_active ? "Archive" : "Restore"}
                      </ActionButton>
                    </div>
                  </Td>
                </tr>
              );
            })}
          </AdminTable>

          <div className="px-4 pb-4">
            <Pagination
              page={page}
              pageCount={pageCount}
              basePath="/admin/products"
              searchParams={{
                status: status !== "all" ? status : undefined,
                search: params.search,
                category: params.category,
              }}
            />
          </div>
        </Card>
      )}
    </>
  );
}
