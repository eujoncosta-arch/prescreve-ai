// ============================================================
// PRESCREVE-AI — RM-06: Drug Repository Layer
//
// PONTO DE ACESSO ÚNICO à base farmacológica canônica.
// NENHUMA funcionalidade deve consultar as bases antigas diretamente —
// toda leitura passa por aqui. A base é construída uma vez (lazy) a partir
// da camada de migração e indexada para busca instantânea.
// ============================================================

import { buildCanonicalDatabase } from './migrate';
import { toMoleculeId, toSlug } from '../governance/data-governance';
import type { DrugEntity } from './types';

class DrugRepository {
  private entities: DrugEntity[] = [];
  private byId = new Map<string, DrugEntity>();
  private byMoleculeId = new Map<string, DrugEntity[]>();
  private byBrandSlug = new Map<string, DrugEntity[]>();
  private byCategory = new Map<string, DrugEntity[]>();
  private byAtc = new Map<string, DrugEntity[]>();
  // RM-25 (perf): índice de busca pré-computado (haystack normalizado por entidade)
  // — evita normalizar todos os campos a cada chamada de search().
  private searchIndex: { e: DrugEntity; haystack: string }[] = [];
  private loaded = false;

  private ensureLoaded(): void {
    if (this.loaded) return;
    this.entities = buildCanonicalDatabase();
    for (const e of this.entities) {
      this.byId.set(e.id, e);
      this.push(this.byMoleculeId, e.activeIngredient.moleculeId, e);
      this.push(this.byCategory, e.category, e);
      if (e.activeIngredient.atc) this.push(this.byAtc, e.activeIngredient.atc, e);
      for (const b of e.brands) this.push(this.byBrandSlug, toSlug(b.name), e);
      const haystack = [
        e.activeIngredient.name,
        e.activeIngredient.fullName ?? '',
        ...(e.activeIngredient.sinonimos ?? []),
        ...e.brands.map((b) => b.name),
        e.therapeuticClass,
      ]
        .map(toSlug)
        .join(' ');
      this.searchIndex.push({ e, haystack });
    }
    this.loaded = true;
  }

  private push(map: Map<string, DrugEntity[]>, key: string, e: DrugEntity): void {
    const arr = map.get(key);
    if (arr) arr.push(e);
    else map.set(key, [e]);
  }

  /** Recarrega a base (útil em testes / após migração). */
  reload(): void {
    this.loaded = false;
    this.byId.clear();
    this.byMoleculeId.clear();
    this.byBrandSlug.clear();
    this.byCategory.clear();
    this.byAtc.clear();
    this.searchIndex = [];
    this.ensureLoaded();
  }

  /** Todos os registros canônicos. */
  getAll(): DrugEntity[] {
    this.ensureLoaded();
    return this.entities;
  }

  count(): number {
    this.ensureLoaded();
    return this.entities.length;
  }

  /** Busca por id canônico (drug entity id). */
  getById(id: string): DrugEntity | undefined {
    this.ensureLoaded();
    return this.byId.get(id);
  }

  /** Registros de um princípio ativo (aceita molecule_id `mol:...`, DCB livre ou nome com sal). */
  getByActiveIngredient(ingredient: string): DrugEntity[] {
    this.ensureLoaded();
    const mid = ingredient.startsWith('mol:') ? ingredient : toMoleculeId(ingredient);
    return this.byMoleculeId.get(mid) ?? [];
  }

  /** Registros que contêm uma marca comercial (por nome). */
  getByBrand(brandName: string): DrugEntity[] {
    this.ensureLoaded();
    return this.byBrandSlug.get(toSlug(brandName)) ?? [];
  }

  getByCategory(category: string): DrugEntity[] {
    this.ensureLoaded();
    return this.byCategory.get(category) ?? [];
  }

  getByAtc(atc: string): DrugEntity[] {
    this.ensureLoaded();
    return this.byAtc.get(atc) ?? [];
  }

  /**
   * Busca textual: princípio ativo, sinônimos, marcas e classe.
   * Retorna no máximo `limit` resultados (default 20).
   */
  search(query: string, limit = 20): DrugEntity[] {
    this.ensureLoaded();
    const q = toSlug(query);
    if (!q) return [];
    const out: DrugEntity[] = [];
    for (const { e, haystack } of this.searchIndex) {
      if (haystack.includes(q)) {
        out.push(e);
        if (out.length >= limit) break;
      }
    }
    return out;
  }
}

/** Instância única (singleton) do repositório canônico. */
export const drugRepository = new DrugRepository();
