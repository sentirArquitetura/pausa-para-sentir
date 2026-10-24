import { CatalogItem, SiteContent, StoreSettings, newCatalogItem } from './models';

// Textos longos: linha em branco separa parágrafos, **texto** vira destaque.
export const DEFAULT_CONTENT: SiteContent = {
  hero: {
    eyebrow: 'Pausa para Sentir',
    title: 'Você não precisa de mais um lugar para ir.',
    subtitle: 'Talvez precise de um momento para ficar.',
    cta: 'Quero viver essa pausa',
    image: 'img/kit5.jpeg',
  },
  manifesto: {
    lead: 'Vivemos cercados de estímulos.',
    body:
      'Notificações. Ruídos. Pressa. Tarefas. Cobranças.\n\n' +
      'E, no meio de tudo isso, existe uma coisa que quase sempre fica para depois:',
    highlight: 'sentir.',
    closing:
      'O **Pausa para Sentir** nasceu para criar um intervalo no automático.\n\n' +
      'Um ritual pensado para desacelerar, acolher o corpo e despertar os cinco sentidos através de experiências cuidadosamente escolhidas.\n\n' +
      '**Não é apenas um kit.\nÉ uma pausa.**',
    image: 'img/kit1.jpeg',
  },
  senses: {
    title: 'Um ritual para os cinco sentidos',
    intro: 'Cada elemento foi escolhido para provocar uma experiência diferente.',
    items: [
      {
        icon: '👁',
        sense: 'Visão',
        title: 'Entre o Concreto e o Verde',
        body:
          'Meu livro, *Entre o Concreto e o Verde*, é um convite para olhar para os espaços que habitamos de outra maneira.\n\n' +
          'Porque os ambientes não são apenas cenário.\n\n' +
          'Eles participam da nossa experiência, do nosso comportamento e da forma como sentimos.',
        highlight: 'Um livro para olhar. E também para perceber.',
        credit: '',
      },
      {
        icon: '🎧',
        sense: 'Audição',
        title: 'Meditação para Relaxar',
        body:
          'Uma experiência guiada por **Thiago Sousa**, terapeuta integrativo sistêmico.\n\n' +
          'Feche os olhos.\nDiminua o ritmo.\n\n' +
          'Deixe a voz conduzir você para um lugar onde, por alguns minutos, não é preciso fazer nada.',
        highlight: 'Só estar.',
        credit: '',
      },
      {
        icon: '🍵',
        sense: 'Paladar',
        title: 'Chá de Lavanda',
        body:
          'Uma pausa também pode ser saboreada.\n\n' +
          'O chá de lavanda convida a desacelerar e transformar um simples momento em um pequeno ritual de cuidado.\n\n' +
          'Prepare.\nRespire.\nSaboreie.',
        highlight: 'Sem pressa.',
        credit: 'Curadoria: Fernanda Familiar',
      },
      {
        icon: '🦶',
        sense: 'Tato',
        title: 'Escalda-pés para Relaxamento',
        body:
          'Alecrim, calêndula, camomila e erva-doce.\n\n' +
          'Uma experiência para os pés — mas que começa muito antes deles.\n\n' +
          'Água morna.\nAromas.\nTexturas.\nTemperatura.\n\n' +
          'O corpo recebendo a mensagem que tantas vezes ignoramos:',
        highlight: 'agora você pode parar.',
        credit: 'AteLILIê — Liliane Silva',
      },
      {
        icon: '🕯',
        sense: 'Olfato',
        title: 'Vela Aromática de Acolhimento',
        body:
          'Baunilha e quartzo rosa.\n\n' +
          'Uma combinação criada para transformar o ambiente e criar uma atmosfera de acolhimento.\n\n' +
          'Acenda a vela.\nDiminua as luzes.\nRespire.',
        highlight: 'Permita que o espaço mude junto com você.',
        credit: 'AteLILIê — Liliane Silva',
      },
    ],
  },
  ritual: {
    title: 'Cinco sentidos.\nUma pausa.',
    body:
      'O **Pausa para Sentir** foi criado para que você possa transformar alguns minutos do seu dia em um ritual.\n\n' +
      'Não existe jeito certo.',
    options:
      'Você pode começar pelo livro.\n' +
      'Ou pelo chá.\n' +
      'Acender a vela.\n' +
      'Colocar a meditação.\n' +
      'Preparar o escalda-pés.\n' +
      'Ou simplesmente escolher um canto da casa e permitir-se ficar ali.',
    closing: 'A pausa é sua.',
    image: 'img/kit3.jpeg',
  },
  kit: {
    title: 'O que vem no seu kit',
    items:
      'Livro *Entre o Concreto e o Verde*\n' +
      'Meditação guiada para relaxamento\n' +
      'Chá de lavanda\n' +
      'Escalda-pés para relaxamento\n' +
      'Vela aromática de acolhimento com quartzo rosa',
    body: 'Tudo reunido em uma experiência criada para despertar os sentidos e transformar o ato de parar em um ritual.',
    cta: 'Quero viver essa pausa',
    image: 'img/kit2.jpeg',
    gallery: ['img/kit1.jpeg', 'img/kit4.jpeg', 'img/kit3.jpeg'],
  },
  essence: {
    title: 'Não é sobre ter mais uma coisa.',
    lead: 'É sobre experimentar diferente aquilo que você já tem:',
    words: 'tempo.\ncorpo.\ncasa.\nsilêncio.\npresença.',
    body: 'Porque talvez o luxo, hoje, não seja fazer mais.',
    closing: 'Talvez seja conseguir parar.',
  },
  invite: {
    title: 'Pausa para Sentir',
    subtitle: 'Seu convite para sair do automático.',
    cta: 'Quero viver essa pausa',
    image: 'img/kit4.jpeg',
  },
  shop: {
    eyebrow: 'Loja',
    title: 'Monte a sua pausa',
    intro: 'Leve o kit completo, outros kits ou escolha cada elemento do ritual separadamente.',
  },
  atelier: {
    eyebrow: 'Ateliê Pausa para Sentir',
    title: 'Uma curadoria que vai além do óbvio',
    body:
      'O Pausa para Sentir também nasce de uma inquietação:\n\n' +
      '**por que tudo precisa ser igual?**\n\n' +
      'Por isso, além do kit, o Ateliê Pausa para Sentir será um espaço de curadoria de objetos, produtos e experiências sensoriais escolhidos por aquilo que têm de especial.',
    tags: 'Artesãos\nCriadores\nObjetos inesperados\nPeças únicas\nDesign\nAfeto\nHistórias',
    highlight: 'Tudo aquilo que provoca alguma coisa em você.\n\n**Porque sentir também é uma forma de escolher.**',
    soon: 'Em breve, uma coleção de coisas que você provavelmente não estava procurando.',
    soonClosing: 'Mas vai querer encontrar.',
    image: 'img/pausaParaSentir.jpg',
  },
};

export const DEFAULT_SETTINGS: StoreSettings = {
  pixKey: '57341335000190',
  merchantName: 'Pausa para Sentir',
  merchantCity: 'Sao Paulo',
  paymentNote:
    'Assim que o pagamento for identificado, o status do seu pedido muda para "Pagamento confirmado". A conferência é feita manualmente em até 1 dia útil.',
};

/** Catálogo inicial: os cinco elementos do ritual e o kit que reúne todos. */
export function seedCatalog(id: () => string): CatalogItem[] {
  const product = (name: string, description: string, image: string, sort: number): CatalogItem => ({
    ...newCatalogItem('product'),
    id: id(),
    name,
    description,
    images: [image],
    sort,
  });
  const products = [
    product('Livro Entre o Concreto e o Verde', 'Um convite para olhar para os espaços que habitamos de outra maneira.', 'img/kit3.jpeg', 10),
    product('Meditação guiada para relaxamento', 'Experiência guiada por Thiago Sousa, terapeuta integrativo sistêmico.', 'img/kit4.jpeg', 20),
    product('Chá de lavanda', 'Uma pausa também pode ser saboreada. Curadoria: Fernanda Familiar.', 'img/kit5.jpeg', 30),
    product('Escalda-pés para relaxamento', 'Alecrim, calêndula, camomila e erva-doce. AteLILIê — Liliane Silva.', 'img/kit2.jpeg', 40),
    product('Vela aromática de acolhimento', 'Baunilha e quartzo rosa. AteLILIê — Liliane Silva.', 'img/kit1.jpeg', 50),
  ];
  const kit: CatalogItem = {
    ...newCatalogItem('kit'),
    id: id(),
    name: 'Kit Pausa para Sentir',
    description: 'Um ritual para os cinco sentidos: livro, meditação guiada, chá, escalda-pés e vela aromática.',
    images: ['img/kit2.jpeg', 'img/kit1.jpeg', 'img/kit4.jpeg', 'img/kit3.jpeg'],
    components: products.map((p) => ({ productId: p.id, name: p.name, quantity: 1 })),
    active: true,
    featured: true,
  };
  return [kit, ...products];
}

/** Garante que conteúdo salvo antes de um campo novo existir continue válido. */
export function mergeContent(saved: Partial<SiteContent> | null | undefined): SiteContent {
  const merged = structuredClone(DEFAULT_CONTENT);
  if (!saved) return merged;
  for (const key of Object.keys(merged) as (keyof SiteContent)[]) {
    if (saved[key]) Object.assign(merged[key], saved[key]);
  }
  return merged;
}
