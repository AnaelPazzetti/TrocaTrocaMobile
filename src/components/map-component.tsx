import type React from 'react';

// Este arquivo serve como a definição de tipo padrão para o TypeScript
// e fallback para o VS Code. Ele resolve o erro de "Cannot find module"
// no VS Code, enquanto o Metro Bundler seleciona automaticamente
// os arquivos '.native.tsx' e '.web.tsx' específicos para cada plataforma.
const PlatformSpecificMap: React.FC<any> = () => {
  return null;
};

export default PlatformSpecificMap;
