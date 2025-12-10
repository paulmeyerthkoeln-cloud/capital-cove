import os
import shutil
import tkinter as tk
from tkinter import messagebox

def copy_files_flat():
    # Hauptfenster von Tkinter ausblenden
    root = tk.Tk()
    root.withdraw()

    # 1. Quellordner ist der Ordner, in dem dieses Skript liegt
    quell_ordner = os.path.dirname(os.path.abspath(__file__))
    
    # --- ÄNDERUNG START ---
    # Pfad zum Desktop (Schreibtisch) ermitteln
    # Funktioniert unter Windows, macOS und Linux
    desktop_pfad = os.path.join(os.path.expanduser("~"), "Desktop")
    
    # Zielordner "Upload" auf dem Desktop definieren
    ziel_ordner = os.path.join(desktop_pfad, "Upload")
    # --- ÄNDERUNG ENDE ---

    # Zielordner erstellen, falls nicht vorhanden
    if not os.path.exists(ziel_ordner):
        os.makedirs(ziel_ordner)
        print(f"Ordner erstellt: {ziel_ordner}")
    else:
        print(f"Ordner existiert bereits: {ziel_ordner}")

    datei_zaehler = 0

    print(f"Kopiervorgang startet in: {quell_ordner}")
    print(f"Zielordner: {ziel_ordner}")

    # Durch alle Ordner und Unterordner laufen
    for wurzel, verzeichnisse, dateien in os.walk(quell_ordner):
        
        # WICHTIG: Falls das Skript selbst auf dem Desktop liegt, 
        # verhindern wir, dass der Zielordner "Upload" selbst durchsucht wird.
        if "Upload" in verzeichnisse:
            # Wir prüfen sicherheitshalber, ob es wirklich unser Zielordner ist
            if os.path.abspath(os.path.join(wurzel, "Upload")) == os.path.abspath(ziel_ordner):
                verzeichnisse.remove("Upload")

        for datei in dateien:
            # 2. Python-Dateien UND PNG-Dateien ignorieren
            if datei.lower().endswith((".py", ".png")):
                continue

            # Pfad der Originaldatei
            quell_datei_pfad = os.path.join(wurzel, datei)
            
            # Pfad der Zieldatei
            ziel_datei_pfad = os.path.join(ziel_ordner, datei)

            try:
                # Kopieren und Metadaten behalten
                shutil.copy2(quell_datei_pfad, ziel_datei_pfad)
                print(f"Kopiert: {datei}")
                datei_zaehler += 1
            except Exception as e:
                print(f"Fehler beim Kopieren von {datei}: {e}")

    # Abschlussmeldung
    msg = f"Fertig! Es wurden {datei_zaehler} Dateien nach\n'{ziel_ordner}'\nkopiert."
    print(msg)
    messagebox.showinfo("Erfolg", msg)

if __name__ == "__main__":
    copy_files_flat()