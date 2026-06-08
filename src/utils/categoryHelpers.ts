import { type Category } from '../types';

export interface FlatCategory {
  id: string;
  name: string;
  level: 0 | 1 | 2;
}

/** Flatten a nested Category tree into a sorted flat list for <select> options. */
export function flattenCategories(roots: Category[]): FlatCategory[] {
  const result: FlatCategory[] = [];
  for (const root of roots) {
    result.push({ id: root.id, name: root.name, level: 0 });
    for (const sub of root.subcategories ?? []) {
      result.push({ id: sub.id, name: sub.name, level: 1 });
      for (const child of sub.subcategories ?? []) {
        result.push({ id: child.id, name: child.name, level: 2 });
      }
    }
  }
  return result;
}

/** Build a full path label from an embedded category (uses parent chain). */
export function getCategoryLabel(category: Category | null | undefined): string {
  if (!category) return 'Uncategorized';
  if (!category.parent) return category.name;
  if (!category.parent.parent) return `${category.parent.name} › ${category.name}`;
  return `${category.parent.parent.name} › ${category.parent.name} › ${category.name}`;
}

interface HasCategory {
  category?: Category | null;
}

/** Group items by their root category, regardless of nesting depth. */
export function groupByRootCategory<T extends HasCategory>(
  items: T[]
): Array<{ root: string; items: T[] }> {
  const map = new Map<string, { root: string; items: T[] }>();

  for (const item of items) {
    const cat = item.category;
    let rootName = 'Uncategorized';
    if (cat) {
      if (cat.parent?.parent) {
        rootName = cat.parent.parent.name;
      } else if (cat.parent) {
        rootName = cat.parent.name;
      } else {
        rootName = cat.name;
      }
    }
    if (!map.has(rootName)) {
      map.set(rootName, { root: rootName, items: [] });
    }
    map.get(rootName)!.items.push(item);
  }

  return Array.from(map.values());
}
