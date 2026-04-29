"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ExternalLink } from "lucide-react";
import { useTranslations } from "next-intl";
import type { DocumentCategory } from "@/lib/types/database";

const CATEGORIES: DocumentCategory[] = [
  "Update Mensual",
  "Term Sheet",
  "Legal",
  "Informe Trimestral",
  "Documentos proyectos",
];

type Doc = {
  id: string;
  fund_id?: string;
  name: string;
  category: DocumentCategory;
  storage_path: string;
  created_at: string;
  funds: { name: string } | null;
};

export function DocumentsPanel({
  documents,
  funds,
  investorsByFund,
}: {
  documents: Doc[];
  funds: { id: string; name: string }[];
  investorsByFund?: Record<string, string[]>;
}) {
  const t = useTranslations("documents");
  const [fundFilter, setFundFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");

  const filtered = documents.filter((d) => {
    const fundMatch = fundFilter === "all" || d.funds?.name === fundFilter;
    const catMatch = categoryFilter === "all" || d.category === categoryFilter;
    return fundMatch && catMatch;
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3">
        <Select value={fundFilter} onValueChange={setFundFilter}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder={t("filterByFund")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("allFunds")}</SelectItem>
            {funds.map((f) => (
              <SelectItem key={f.id} value={f.name}>{f.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder={t("filterByType")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("allTypes")}</SelectItem>
            {CATEGORIES.map((c) => (
              <SelectItem key={c} value={c}>{t(`categories.${c}`)}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {!filtered.length ? (
        <p className="text-muted-foreground text-sm py-8">{t("noDocuments")}</p>
      ) : (
        <div className="space-y-2">
          {filtered.map((doc) => (
            <div
              key={doc.id}
              className="flex items-center gap-3 p-3 rounded-md border bg-card hover:bg-accent/30 transition-colors"
            >
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm truncate">{doc.name}</p>
                <p className="text-xs text-muted-foreground">{doc.funds?.name}</p>
                {doc.fund_id && investorsByFund?.[doc.fund_id]?.length ? (
                  <p className="text-xs text-primary truncate">
                    Inversor{investorsByFund[doc.fund_id].length > 1 ? "es" : ""}:{" "}
                    {investorsByFund[doc.fund_id].join(", ")}
                  </p>
                ) : null}
              </div>
              <Badge variant="outline" className="shrink-0 text-xs">
                {t(`categories.${doc.category}`)}
              </Badge>
              <Button asChild size="sm" variant="ghost">
                <a href={`/api/documents/${doc.id}/download`} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-4 w-4" />
                  <span className="sr-only">{t("viewDocument")}</span>
                </a>
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
