import { game } from './core/Game.js';
import { director } from './core/Director.js';

async function bootstrap() {
    try {
        window.game = game;
        window.director = director; // Für Debug-Zugriff

        await game.init();
        
        // WICHTIG: Render-Loop starten, damit man im Intro etwas sieht
        game.start(); 

        const loadingScreen = document.getElementById('loading-screen');
        if (loadingScreen) {
            loadingScreen.classList.add('fade-out');
            setTimeout(() => {
                loadingScreen.style.display = 'none';
            }, 1000);
        }

        director.startIntroSequence();

    } catch (error) {
        console.error(error);
        
        const loadingScreen = document.getElementById('loading-screen');
        if (loadingScreen) {
            loadingScreen.innerHTML = `
                <div style="color: #ff6b6b; padding: 20px; text-align: center; font-family: sans-serif;">
                    <h2>System Error</h2>
                    <p>${error.message}</p>
                    <pre style="text-align: left; background: rgba(0,0,0,0.5); padding: 10px; overflow: auto;">${error.stack}</pre>
                </div>
            `;
        }
    }
}

window.addEventListener('DOMContentLoaded', bootstrap);