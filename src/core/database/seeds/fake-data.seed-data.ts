import { Role } from '@/common/enums';

export const SEED_LOCALE = 'ru';

type ProductSeedMetadata = Record<string, unknown> & {
  brand: string;
  unit: string;
  careNote?: string;
};

interface ProductSeedData {
  name: string;
  price: number;
  cost: number;
  description: string;
  metadata: ProductSeedMetadata;
}

export interface ShopSeedData {
  name: string;
  slug: string;
  description: string;
  address: string;
  phone: string;
  workingHours: Record<string, string>;
  categories: { name: string; slug: string }[];
  products: ProductSeedData[];
}

export interface SeedUserData {
  email: string;
  role: Role;
  shopSeedIndex: number | null;
}

export const SHOP_SEEDS: ShopSeedData[] = [
  {
    name: 'Зоо Лапки и Хвост',
    slug: 'zoo-lapki-hvost',
    description:
      'Магазин кормов, игрушек и ухода для кошек и собак рядом с домом.',
    address: 'г. Москва, ул. Профсоюзная, д. 18',
    phone: '+7 (495) 120-11-22',
    workingHours: {
      monday: '09:00-21:00',
      tuesday: '09:00-21:00',
      wednesday: '09:00-21:00',
      thursday: '09:00-21:00',
      friday: '09:00-21:00',
      saturday: '10:00-20:00',
      sunday: '10:00-19:00',
    },
    categories: [
      { name: 'Корма', slug: 'korma' },
      { name: 'Лакомства', slug: 'lakomstva' },
      { name: 'Игрушки', slug: 'igrushki' },
      { name: 'Уход и гигиена', slug: 'ukhod-i-gigiena' },
    ],
    products: [
      {
        name: 'Сухой корм для собак с индейкой',
        price: 1890,
        cost: 1240,
        description:
          'Полнорационный корм для собак средних пород на каждый день.',
        metadata: {
          brand: 'Добрый Хвост',
          unit: 'мешок 3 кг',
          careNote: 'Подходит для взрослых собак.',
        },
      },
      {
        name: 'Влажный корм для кошек с кроликом',
        price: 129,
        cost: 74,
        description: 'Нежные кусочки в соусе для привередливых домашних кошек.',
        metadata: {
          brand: 'Муркин Дом',
          unit: 'пауч 85 г',
          careNote: 'Подавать при комнатной температуре.',
        },
      },
      {
        name: 'Гипоаллергенное лакомство для собак',
        price: 420,
        cost: 230,
        description:
          'Лакомство без курицы и пшеницы для собак с чувствительным пищеварением.',
        metadata: {
          brand: 'Лапа Баланс',
          unit: 'упаковка 100 г',
          careNote: 'Давать как поощрение между кормлениями.',
        },
      },
      {
        name: 'Наполнитель комкующийся без запаха',
        price: 760,
        cost: 430,
        description:
          'Минеральный наполнитель для лотка с быстрым впитыванием влаги.',
        metadata: {
          brand: 'Чистый Лоток',
          unit: 'пакет 10 л',
          careNote: 'Хранить в сухом помещении.',
        },
      },
      {
        name: 'Шлейка для собаки среднего размера',
        price: 1450,
        cost: 870,
        description:
          'Мягкая прогулочная шлейка с регулируемыми ремнями и светоотражателями.',
        metadata: {
          brand: 'Городской Пёс',
          unit: 'размер М',
          careNote: 'Подходит для прогулок и поездок.',
        },
      },
      {
        name: 'Игрушка мяч для активных собак',
        price: 390,
        cost: 190,
        description:
          'Упругий мяч из безопасного материала для игр дома и на улице.',
        metadata: {
          brand: 'Весёлый Питомец',
          unit: '1 шт',
          careNote: 'Промывать тёплой водой после улицы.',
        },
      },
      {
        name: 'Шампунь для длинношёрстных кошек',
        price: 540,
        cost: 295,
        description:
          'Мягкий шампунь для ухода за шерстью и уменьшения спутывания.',
        metadata: {
          brand: 'Пушистый День',
          unit: 'флакон 250 мл',
          careNote: 'Избегать попадания в глаза.',
        },
      },
      {
        name: 'Пелёнки впитывающие для щенков',
        price: 690,
        cost: 380,
        description: 'Одноразовые пелёнки для приучения щенка к чистоте дома.',
        metadata: {
          brand: 'Тихий Дом',
          unit: 'упаковка 30 шт',
          careNote: 'Менять по мере наполнения.',
        },
      },
    ],
  },
  {
    name: 'Огород Сезон',
    slug: 'ogorod-sezon',
    description:
      'Магазин семян, рассады и инвентаря для дачи, теплицы и огорода.',
    address: 'г. Краснодар, ул. Северная, д. 84',
    phone: '+7 (861) 210-33-44',
    workingHours: {
      monday: '08:00-20:00',
      tuesday: '08:00-20:00',
      wednesday: '08:00-20:00',
      thursday: '08:00-20:00',
      friday: '08:00-20:00',
      saturday: '09:00-19:00',
      sunday: '09:00-18:00',
    },
    categories: [
      { name: 'Семена', slug: 'semena' },
      { name: 'Рассада', slug: 'rassada' },
      { name: 'Удобрения', slug: 'udobreniya' },
      { name: 'Инвентарь', slug: 'inventar' },
    ],
    products: [
      {
        name: 'Семена томата для теплицы',
        price: 95,
        cost: 38,
        description:
          'Раннеспелый сорт томата для стабильного урожая в закрытом грунте.',
        metadata: {
          brand: 'Грядка Юга',
          unit: 'пакет 20 семян',
          careNote: 'Высевать на рассаду в феврале и марте.',
        },
      },
      {
        name: 'Семена огурца пчёлоопыляемого',
        price: 82,
        cost: 34,
        description:
          'Сорт для открытого грунта с дружным плодоношением в сезон.',
        metadata: {
          brand: 'Урожайный Край',
          unit: 'пакет 15 семян',
          careNote: 'Лучше растёт на солнечных грядках.',
        },
      },
      {
        name: 'Рассада клубники ремонтантной',
        price: 260,
        cost: 150,
        description:
          'Крепкая рассада для высадки в грунт и сбора ягод до осени.',
        metadata: {
          brand: 'Садовая Линия',
          unit: 'кассета 6 ячеек',
          careNote: 'Требует регулярного полива после высадки.',
        },
      },
      {
        name: 'Грунт универсальный для овощей',
        price: 310,
        cost: 170,
        description:
          'Питательный грунт для рассады, грядок и тепличных культур.',
        metadata: {
          brand: 'Чёрная Земля',
          unit: 'мешок 25 л',
          careNote: 'Подходит для томатов, перцев и зелени.',
        },
      },
      {
        name: 'Удобрение жидкое для рассады',
        price: 240,
        cost: 118,
        description:
          'Комплексное удобрение для активного роста листьев и корневой системы.',
        metadata: {
          brand: 'Росток Плюс',
          unit: 'флакон 500 мл',
          careNote: 'Разводить по инструкции перед поливом.',
        },
      },
      {
        name: 'Опрыскиватель садовый ручной',
        price: 790,
        cost: 470,
        description:
          'Ручной опрыскиватель для обработки листьев и внесения удобрений.',
        metadata: {
          brand: 'Дачный Инструмент',
          unit: 'бак 2 л',
          careNote: 'Промывать после каждого использования.',
        },
      },
      {
        name: 'Лейка пластиковая для теплицы',
        price: 430,
        cost: 210,
        description:
          'Лёгкая лейка с длинным носиком для аккуратного полива рассады.',
        metadata: {
          brand: 'Зелёный Сад',
          unit: 'объём 5 л',
          careNote: 'Хранить вдали от прямого солнца.',
        },
      },
      {
        name: 'Секатор для тонких веток',
        price: 980,
        cost: 560,
        description:
          'Острый секатор для обрезки побегов, рассады и молодых ветвей.',
        metadata: {
          brand: 'Мастер Грядки',
          unit: '1 шт',
          careNote: 'После работы протирать и сушить лезвия.',
        },
      },
    ],
  },
];

export const CHAT_EVENT_QUERIES = [
  'Есть ли гипоаллергенный корм для кошек?',
  'Подскажите, когда будет наполнитель в большом пакете?',
  'Какие семена томатов лучше взять для теплицы?',
  'Есть ли удобрение для рассады без резкого запаха?',
  'Можно ли сегодня забрать заказ самовывозом?',
  'Какая шлейка подойдёт собаке среднего размера?',
  'Какой грунт лучше выбрать для перца и баклажанов?',
  'Во сколько вы открываетесь в воскресенье?',
];

export function buildSeedUsers(): SeedUserData[] {
  const shopUsers = SHOP_SEEDS.flatMap((shop, index) => {
    const domain = `${shop.slug}.ru`;

    return [
      {
        email: `owner@${domain}`,
        role: Role.OWNER,
        shopSeedIndex: index,
      },
      {
        email: `manager@${domain}`,
        role: Role.EMPLOYEE,
        shopSeedIndex: index,
      },
    ];
  });

  return [
    ...shopUsers,
    {
      email: 'admin@retail-saas.com',
      role: Role.ADMIN,
      shopSeedIndex: null,
    },
  ];
}
