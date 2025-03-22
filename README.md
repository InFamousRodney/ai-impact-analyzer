# AI Impact Analyzer

Een tool die AI gebruikt om de impact van Salesforce data te analyseren en inzichten te genereren.

## Features

- Salesforce OAuth integratie
- Automatische data extractie
- AI-gedreven analyse
- Visuele rapportage
- Configuratie dashboard

## Technische Stack

- Node.js
- Express.js
- Salesforce API
- OpenAI API
- React (frontend)

## Setup

1. Clone de repository:
```bash
git clone https://github.com/[username]/ai-impact-analyzer.git
cd ai-impact-analyzer
```

2. Installeer dependencies:
```bash
npm install
```

3. Maak een `.env` bestand aan in de root directory met de volgende variabelen:
```env
SF_CLIENT_ID=your_salesforce_client_id
SF_CLIENT_SECRET=your_salesforce_client_secret
SF_REDIRECT_URI=http://localhost:3000/oauth/callback
SF_LOGIN_URL=https://login.salesforce.com
SF_API_VERSION=v57.0
```

4. Start de development server:
```bash
npm run dev
```

## Salesforce Setup

1. Maak een Connected App aan in Salesforce:
   - Ga naar Setup > App Manager > New Connected App
   - Vul de volgende gegevens in:
     - Connected App Name: AI Impact Analyzer
     - API Name: AI_Impact_Analyzer
     - Contact Email: [jouw email]
     - Callback URL: http://localhost:3000/oauth/callback
     - Selected OAuth Scopes: api, refresh_token

2. Na het aanmaken, kopieer de Client ID en Client Secret naar je `.env` bestand.

## Project Structuur

```
ai-impact-analyzer/
├── src/
│   ├── api/           # API endpoints
│   ├── auth/          # Authenticatie logica
│   ├── config/        # Configuratie bestanden
│   ├── core/          # Kern applicatie logica
│   ├── models/        # Data modellen
│   ├── services/      # Business services
│   ├── utils/         # Utility functies
│   └── test/          # Test bestanden
├── .env               # Environment variabelen
├── .gitignore         # Git ignore regels
├── package.json       # Project dependencies
└── README.md         # Project documentatie
```

## Development

### Tests uitvoeren
```bash
npm test
```

### Code style check
```bash
npm run lint
```

## Contributing

1. Fork de repository
2. Maak een feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit je wijzigingen (`git commit -m 'Add some AmazingFeature'`)
4. Push naar de branch (`git push origin feature/AmazingFeature`)
5. Open een Pull Request

## License

Dit project is gelicentieerd onder de MIT License - zie het [LICENSE](LICENSE) bestand voor details.

## 👥 Authors

- Rodney Ackermans - Initial work

## 🙏 Acknowledgments

- Salesforce DX Team
- Open Source Community
