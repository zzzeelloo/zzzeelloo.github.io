# Portfolio 3D – Étudiant en informatique 🎓🪐

Un site portfolio **3D interactif**, moderne et entièrement **responsive**, pensé pour un étudiant en informatique.  
La scène 3D réagit au **curseur**, plusieurs cartes ont un **effet de tilt**, et le design est optimisé pour desktop, tablette et mobile.

## Stack

- **HTML / CSS / JavaScript vanilla**
- **Three.js** (chargé via CDN) pour la scène 3D
- Aucune étape de build obligatoire : tout fonctionne en **site statique**.

## Structure du projet

- `index.html` – structure de la page et sections (hero 3D, à propos, compétences, projets, contact)
- `style.css` – styles globaux, mise en page responsive, thème, micro-interactions
- `main.js` – logique du curseur personnalisé, tilt des cartes, navigation mobile, scène Three.js

## Lancer le site en local

Comme c’est un site statique pur, tu as deux options :

### 1. Ouvrir directement le fichier

1. Ouvre le dossier `3d-portfolio`.
2. Double-clique sur `index.html` pour l’ouvrir dans ton navigateur.

> Selon le navigateur, certaines fonctionnalités (surtout WebGL) peuvent mieux marcher via un petit serveur local. Si tu constates des soucis, utilise l’option 2.

### 2. Utiliser un petit serveur local (recommandé pour le dev)

Tu peux utiliser n’importe quel serveur statique, par exemple :

- **Python 3** :

  ```bash
  cd 3d-portfolio
  python -m http.server 5173
  ```

  Puis ouvre `http://localhost:5173` dans ton navigateur.

- Ou une extension de serveur live dans VS Code / Cursor (par ex. "Live Server").

## Déploiement

Comme c’est un site statique, tu peux le déployer facilement sur :

- GitHub Pages
- Netlify
- Vercel

Le principe : tu pousses ce dossier dans un repo, puis tu configures le service pour servir le contenu du dossier `3d-portfolio` ou de la branche correspondante.

## Personnalisation rapide

Tu peux modifier facilement :

- **Ton nom / tagline** : dans `index.html` (hero + footer).
- **Texte À propos / Compétences / Projets** : toujours dans `index.html`, sections `about`, `skills`, `projects`.
- **Couleurs et style global** : dans `style.css` (variables `:root` en haut du fichier).
- **Intensité des effets 3D & curseur** : dans `main.js` (valeurs de rotation, vitesses, etc.).

N’hésite pas à me demander si tu veux :

- Ajouter une section (par ex. CV, blog, timeline de ton parcours),
- Brancher le formulaire de contact sur un vrai backend ou un service externe,
- Ou intégrer d’autres expériences 3D (parallax au scroll, modèles glTF, etc.).

