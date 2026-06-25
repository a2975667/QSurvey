import { useRef, useState } from "react";
import Select from "react-select";
import { IBackendQVPlusFollowup } from "../../types/backendTypes";
// Reuse the QV vote dropdown styles so the followup dropdown looks identical to
// the voting stage's dropdown.
import "../VoteSelection/Dropdown.css";

interface FollowupSelectProps {
  followup: IBackendQVPlusFollowup;
  // Currently selected choiceId for this followup (null/undefined = nothing chosen).
  value?: string | null;
  onChange: (choiceId: string) => void;
  // When true, render the dropdown "frameless" (transparent border/background,
  // no indicator) so it reads as plain text. The element is still the same size,
  // so toggling flat on hover causes no layout shift.
  flat?: boolean;
  // Localized "nothing selected yet" placeholder. Defaults to English so the
  // component never falls back to a hard-coded single-locale string.
  placeholder?: string;
}

/**
 * A single followup dropdown used in the QVPlus selection stage.
 *
 * Behaviour is ported from VoteSelection: when the menu opens we measure the
 * trigger's position and decide whether the menu should open downward ("auto")
 * or flip upward ("top") so it never gets hidden behind the fixed bottom
 * navigation bar (`.nav-panel`). Each instance owns its own placement state, so
 * a card with several followups flips each dropdown independently.
 */
export const FollowupSelect: React.FC<FollowupSelectProps> = ({
  followup,
  value,
  onChange,
  flat = false,
  placeholder = "Select...",
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [menuIsOpen, setMenuIsOpen] = useState(false);
  const [menuPlacement, setMenuPlacement] = useState<"auto" | "top">("auto");

  const choiceOptions = followup.choices.map((c) => ({
    value: c.choiceId,
    label: c.label,
  }));
  const selectedOption = choiceOptions.find((o) => o.value === value) ?? null;

  // Decide whether to open the menu downward ("auto") or upward ("top") based on
  // how much room is left below the trigger before the fixed bottom nav bar.
  const chooseMenuPlacement = (): "auto" | "top" => {
    if (typeof window === "undefined" || !containerRef.current) {
      return "auto";
    }
    const rect = containerRef.current.getBoundingClientRect();
    const rootFontSize = parseFloat(
      getComputedStyle(document.documentElement).fontSize || "16",
    );
    const menuHeight = rootFontSize * 20;
    const nav = document.querySelector(".nav-panel") as HTMLElement | null;
    const navTop = nav ? nav.getBoundingClientRect().top : window.innerHeight;
    if (rect.bottom + menuHeight + rootFontSize > navTop) {
      return "top";
    }
    return "auto";
  };

  return (
    <div className="qvplus-followup-block">
      <span className="qvplus-followup-label">{followup.prompt}</span>
      <div
        className="select-dropdown-container"
        ref={containerRef}
        onClick={() => {
          if (!menuIsOpen) {
            setMenuPlacement(chooseMenuPlacement());
            setMenuIsOpen(true);
          }
        }}
      >
        <Select
          className="select-dropdown-menu"
          classNamePrefix="select"
          value={selectedOption}
          options={choiceOptions}
          menuPlacement={menuPlacement}
          menuIsOpen={menuIsOpen}
          onChange={(opt) => {
            if (opt) onChange(opt.value);
            setMenuIsOpen(false);
          }}
          onMenuClose={() => setMenuIsOpen(false)}
          isSearchable={false}
          placeholder={placeholder}
          // Render the menu in a portal at <body> so it is never clipped by the
          // card's overflow; the high z-index keeps it above the nav bar.
          menuPortalTarget={document.body}
          styles={{
            menu: (base: any) => ({ ...base, zIndex: 9999 }),
            menuPortal: (base: any) => ({ ...base, zIndex: 9999 }),
            // Larger text for prompt values, placeholder and options.
            singleValue: (base: any) => ({ ...base, fontSize: 16 }),
            placeholder: (base: any) => ({ ...base, fontSize: 16 }),
            option: (base: any) => ({ ...base, fontSize: 16 }),
            // Keep a constant footprint; only the visible frame changes on hover.
            // (transparent — not "none" — border preserves the 1px height.)
            control: (base: any) => ({
              ...base,
              minHeight: 38,
              ...(flat
                ? {
                    border: "1px solid transparent",
                    boxShadow: "none",
                    backgroundColor: "transparent",
                  }
                : {}),
            }),
            dropdownIndicator: (base: any) => ({
              ...base,
              ...(flat ? { display: "none" } : {}),
            }),
            indicatorSeparator: (base: any) => ({
              ...base,
              ...(flat ? { display: "none" } : {}),
            }),
          }}
        />
      </div>
    </div>
  );
};

export default FollowupSelect;
