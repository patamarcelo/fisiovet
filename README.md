# FisioVet - FisioVet Planner 🐾

![Status](https://img.shields.io/badge/status-em%20desenvolvimento-yellow) ![License](https://img.shields.io/badge/license-MIT-blue) ![React Native](https://img.shields.io/badge/React_Native-0.71-blue) ![Django](https://img.shields.io/badge/Django-4.2-green) ![Node.js](https://img.shields.io/badge/Node.js-20.0-green)

O assistente digital completo para médicos veterinários autônomos, focado em otimizar a rotina de atendimentos de fisioterapia.

---

## 🎯 Problema

Profissionais de fisioterapia veterinária que atuam de forma autônoma, especialmente em atendimentos domiciliares, enfrentam desafios diários:

- 🗒️ Agendas manuais e pouco organizadas  
- 🗺️ Dificuldade em planejar rotas eficientes  
- 💳 Controle financeiro descentralizado  
- 🐶 Históricos de pacientes espalhados em anotações diversas  

O **FisioVet Planner** centraliza todas as necessidades operacionais em um único aplicativo inteligente, economizando tempo e permitindo foco total nos cuidados com os animais.

---

## ✨ Funcionalidades

### 🗓️ Agenda Inteligente
- Agendamento diário, semanal e mensal  
- Status de consulta: confirmado, pendente, cancelado  
- Lembretes automáticos para tutores  

### 🐾 Gestão de Pacientes
- Cadastro completo de tutores e pets  
- Perfis individuais com fotos, histórico médico, diagnóstico e observações  
- **Timeline de Evolução:** anotações SOAP, fotos e vídeos do progresso  

### 🗺️ Otimização de Rotas
- Preenchimento automático de endereço via CEP (API ViaCEP)  
- Visualização de agendamentos em mapa  
- Rotas otimizadas via Google Maps  

### 💳 Gestão Financeira
- Registro de pagamentos por sessão ou pacotes  
- Integração com gateways de pagamento (Stripe, Mercado Pago, Asaas)  
- Relatórios financeiros simplificados  

### 💪 Planos de Tratamento Personalizados
- Criação de planos de tratamento com objetivos claros  
- Biblioteca de exercícios e modalidades  
- Prescrição de atividades domiciliares para tutores  

---

## 🛠️ Tecnologias

### Frontend
- **Framework:** React Native  
- **Gerenciamento de Estado:** Redux Toolkit  

### Backend
- **Frameworks:** Django (robusto e painel admin) & Node.js (Express/NestJS)  

### Banco de Dados
- **Principal:** PostgreSQL (via ORM Django)  
- **Autenticação e Armazenamento:** Firebase (Authentication, Cloud Storage)  

### APIs Externas
- Google Maps API (geolocalização e rotas)  
- ViaCEP (preenchimento automático de endereços)  
- Gateway de Pagamento (Asaas)  

---

## 🚀 Rodando o Projeto

```bash
# Clone o repositório
git clone https://github.com/[seu-usuario]/[seu-repositorio].git
cd [seu-repositorio]

# Backend (Django)
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# Frontend (React Native)
cd ../fisiovet-app
npm install

# Configure variáveis de ambiente
# Crie arquivos .env em backend e frontend baseados nos .env.example

# Rode o backend
cd backend
python manage.py runserver

# Rode o frontend em outro terminal
cd frontend
npm run start

```


## 📈 Roadmap

- [ ] Agenda inteligente completa
- [ ] Gestão de pacientes com timeline de evolução
- [ ] Otimização de rotas e integração com Google Maps
- [ ] Gestão financeira com relatórios
- [ ] Planos de tratamento e biblioteca de exercícios
- [ ] Integração com gateways de pagamento

---

## 🤝 Contribuições

Contribuições são bem-vindas!  

1. Faça um fork do projeto  
2. Crie uma branch: `git checkout -b feature/sua-feature`  
3. Commit suas alterações: `git commit -m "Adiciona nova feature"`  
4. Push da branch: `git push origin feature/sua-feature`  
5. Abra um Pull Request  

---

## 📄 Licença

Este projeto está sob a licença **MIT**. Consulte o arquivo `LICENSE` para mais detalhes.

---

## 📬 Contato

**Marcelo Pata**  
- LinkedIn: [linkedin.com/in/patamarcelo](https://linkedin.com/in/patamarcelo)  
- GitHub: [github.com/patamarcelo](https://github.com/patamarcelo)

