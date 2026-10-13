import { Moon, Orbit, Pause, Sun } from "lucide-react";
import { useAppearance } from "../context/AppearanceContext";
export function AppearanceControls() {
  const { dark, toggleTheme, atmosphere, reduced, toggleAtmosphere } =
    useAppearance();
  const motionLabel = reduced
    ? "Atmosfera estática: movimento reduzido do dispositivo"
    : atmosphere
      ? "Pausar atmosfera"
      : "Ativar atmosfera";
  return (
    <div className="appearance-controls">
      <button
        className="icon-button theme-button"
        onClick={toggleTheme}
        aria-label={dark ? "Usar tema claro" : "Usar tema escuro"}
        title={dark ? "Usar tema claro" : "Usar tema escuro"}
      >
        {dark ? (
          <Sun size={18} aria-hidden="true" />
        ) : (
          <Moon size={18} aria-hidden="true" />
        )}
      </button>
      <button
        className="icon-button atmosphere-button"
        onClick={toggleAtmosphere}
        disabled={reduced}
        aria-label={motionLabel}
        title={motionLabel}
        aria-pressed={atmosphere}
      >
        {atmosphere ? (
          <Pause size={17} aria-hidden="true" />
        ) : (
          <Orbit size={18} aria-hidden="true" />
        )}
      </button>
    </div>
  );
}
