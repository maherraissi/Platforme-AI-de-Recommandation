# Guide de démarrage - Plateforme AI de Recommandation

Bienvenue sur la plateforme d'IA de recommandation ! Ce guide vous aidera à configurer et exécuter le projet sur votre machine locale.

## Prérequis

Avant de commencer, assurez-vous d'avoir installé les éléments suivants :

- [Docker](https://www.docker.com/get-started)
- [Docker Compose](https://docs.docker.com/compose/install/)
- [Git](https://git-scm.com/)

## Installation

1. **Cloner le dépôt**
   ```bash
   git clone [URL_DU_DEPOT]
   cd "Platforme AI de Recommandation"
   ```

2. **Configurer les variables d'environnement**
   Créez un fichier `.env` à la racine du projet en vous basant sur le fichier `.env.example` (si disponible).

## Démarrage des services

Pour lancer l'application avec Docker Compose :

```bash
docker-compose up -d
```

Cette commande va démarrer tous les services nécessaires définis dans le fichier `docker-compose.yml`.

## Accès aux applications

- **Tableau de bord** : http://localhost:3000
- **API** : http://localhost:8000

## Commandes utiles

- Arrêter les services : `docker-compose down`
- Voir les logs : `docker-compose logs -f`
- Redémarrer un service spécifique : `docker-compose restart [nom_du_service]`

## Structure du projet

- `/apps` : Contient les différentes applications du projet
- `/infra` : Configuration de l'infrastructure
- `/career-reco-dashboard` : Tableau de bord des recommandations de carrière

## Développement

Pour contribuer au projet, consultez le fichier `CONTRIBUTING.md` pour les directives de contribution.

## Support

Pour toute question ou problème, veuillez ouvrir une issue sur le dépôt du projet.

## Licence

[À compléter avec la licence du projet]
