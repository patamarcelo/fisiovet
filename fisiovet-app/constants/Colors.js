/**
 * As cores abaixo foram ajustadas para a paleta de fisioterapia veterinária.
 * Elas são otimizadas para o modo claro e escuro, mantendo a consistência visual.
 */

const tintColorLight = 'rgba(162,204,178,1.0)'; // Verde Claro de Destaque
const tintColorLightCheck = 'rgba(162,204,178,0.8)'; // Verde Claro de Destaque
const tintColorDark = '#80B3B3'; // Verde Água para o Dark Mode
const primaryColor = '#007AFF'

export const Colors = {
  light: {
    // Modo Claro: Cores mais claras com um toque profissional
    text: '#003366', // Azul Marinho - para textos principais e títulos
    background: 'whitesmoke', // Cinza Claro - fundo principal
    // background: '#E0E0E0', // Cinza Claro - fundo principal
    tint: tintColorLight, // Verde Claro - para botões e ícones ativos
    tintCheck: tintColorLightCheck,
    icon: '#80B3B3', // Verde Água - para ícones e elementos secundários
    tabIconDefault: '#80B3B3', // Verde Água - ícones de aba padrão
    tabIconSelected: tintColorLight, // Verde Claro - ícones de aba selecionados
    primary:  primaryColor
  },
  dark: {
    // Modo Escuro: Cores invertidas para conforto visual, mantendo a identidade
    text: '#E0E0E0', // Cinza Claro - para textos principais
    background: '#003366', // Azul Marinho - fundo principal
    tint: tintColorDark, // Verde Água - para botões e ícones ativos
    tintCheck: tintColorLightCheck,
    icon: '#A2CCB2', // Verde Claro - para ícones e elementos secundários
    tabIconDefault: '#A2CCB2', // Verde Claro - ícones de aba padrão
    tabIconSelected: tintColorDark, // Verde Água - ícones de aba selecionados
    primary:  primaryColor
  },
};