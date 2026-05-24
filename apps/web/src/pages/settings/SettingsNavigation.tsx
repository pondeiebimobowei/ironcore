import { NavLink } from "react-router-dom";
import {
  settingsNavigation,
  type SettingsTab,
} from "../../features/organizations/settings";

type SettingsNavigationProps = {
  currentLabel: SettingsTab;
};

function getLinkClass({ isActive }: { isActive: boolean }) {
  return isActive ? "active" : undefined;
}

export function SettingsNavigation({ currentLabel }: SettingsNavigationProps) {
  return (
    <div className="settings-navigation">
      <nav className="settings-section-nav" aria-label="Settings sections">
        {settingsNavigation.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.path === "/settings"}
            className={getLinkClass}
          >
            {item.label}
          </NavLink>
        ))}
      </nav>

      <details className="settings-mobile-menu">
        <summary>
          <span>{currentLabel}</span>
          <strong>Menu</strong>
        </summary>
        <nav aria-label="Settings sections">
          {settingsNavigation.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === "/settings"}
              className={getLinkClass}
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
      </details>
    </div>
  );
}
