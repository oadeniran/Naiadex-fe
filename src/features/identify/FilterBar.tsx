import styles from "./identify.module.css";
import { FILTERS, SORTS, selectOptions, type FilterState } from "./filters";
import type { Observation } from "../../lib/types";

export default function FilterBar({
  items,
  state,
  setState,
  sortId,
  setSortId,
}: {
  items: Observation[];
  state: FilterState;
  setState: (s: FilterState) => void;
  sortId: string;
  setSortId: (id: string) => void;
}) {
  function set(id: string, value: string | boolean) {
    setState({ ...state, [id]: value });
  }

  return (
    <div className={styles.filterBar}>
      {FILTERS.map((def) => {
        if (def.kind === "search") {
          return (
            <input
              key={def.id}
              className={styles.filterSearch}
              placeholder={`Search ${def.label.toLowerCase()}…`}
              value={String(state[def.id] ?? "")}
              onChange={(e) => set(def.id, e.target.value)}
            />
          );
        }
        if (def.kind === "select") {
          const opts = selectOptions(def, items);
          return (
            <select
              key={def.id}
              className={styles.filterSelect}
              value={String(state[def.id] ?? "")}
              onChange={(e) => set(def.id, e.target.value)}
            >
              <option value="">All {def.label.toLowerCase()}</option>
              {opts.map((v) => (
                <option key={v} value={v}>{def.labelFor ? def.labelFor(v) : v}</option>
              ))}
            </select>
          );
        }
        // toggle
        return (
          <label key={def.id} className={styles.filterToggle}>
            <input type="checkbox" checked={!!state[def.id]} onChange={(e) => set(def.id, e.target.checked)} />
            {def.label}
          </label>
        );
      })}

      <select className={styles.filterSelect} value={sortId} onChange={(e) => setSortId(e.target.value)}>
        {SORTS.map((s) => (
          <option key={s.id} value={s.id}>Sort: {s.label}</option>
        ))}
      </select>
    </div>
  );
}