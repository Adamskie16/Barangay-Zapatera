// Admin/src/components/DataTable.d.ts
import { ReactNode } from 'react';

export type SortDirection = 'asc' | 'desc';

export interface ColumnDef<T> {
  key: string;
  header: ReactNode;
  accessor?: keyof T | ((row: T) => any);
  render?: (row: T, index: number) => ReactNode;
  sortable?: boolean;
  sortKey?: string;
  sortFn?: (a: T, b: T, direction: SortDirection) => number;
  align?: 'left' | 'center' | 'right';
  width?: string;
  headerClassName?: string;
  cellClassName?: string;
}

export interface FilterOption {
  value: string;
  label: string;
  count?: number;
}

export interface FilterConfig<T> {
  id: string;
  label?: string;
  value: string;
  onChange: (value: string) => void;
  options: FilterOption[];
  field?: keyof T;
  filterFn?: (row: T, value: string) => boolean;
}

export interface StatusTab {
  id: string;
  label: string;
  count?: number;
}

export interface StatusTabsConfig {
  tabs: StatusTab[];
  activeTab: string;
  onChange: (tabId: string) => void;
}

export interface DataTableProps<T> {
  data: T[];
  columns: ColumnDef<T>[];
  keyField?: keyof T | string;
  searchable?: boolean;
  searchPlaceholder?: string;
  searchKeys?: (keyof T | ((row: T) => string | number | undefined))[];
  filters?: FilterConfig<T>[];
  statusTabs?: StatusTabsConfig | null;
  defaultPageSize?: number;
  pageSizeOptions?: number[];
  defaultSortKey?: string | null;
  defaultSortDirection?: SortDirection;
  emptyTitle?: string;
  emptySubtitle?: string;
  onResetFilters?: () => void;
  loading?: boolean;
  loadingSkeleton?: ReactNode;
  zebraStriping?: boolean;
  fixedHeader?: boolean;
  extraHeaderControls?: ReactNode;
  className?: string;
}

declare function DataTable<T extends Record<string, any>>(props: DataTableProps<T>): JSX.Element;

export default DataTable;
