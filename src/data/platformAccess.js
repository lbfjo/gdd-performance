const RAW_PLATFORM_ACCESS_NAMES = [
  'David Costa',
  'D Torgal',
  'J Granate',
  'A Castineira',
  'Juaco',
  'M Reis',
  'João VA',
  'Martim D.',
  'Fabian',
  'P Ferreira',
  'S Seabra',
  'F Teixeira',
  'J Burnay',
  'A Tapadinhas',
  'A Peixoto',
  'JF Vital',
  'D.Diniz',
  'J Dias',
  'B Nogueira',
  'Joaquim Bustos',
  'L Matos',
  'JM Lupi',
  'Simão N',
  'M Picão',
  'M. Ferreira',
  'F Pinto',
  'Afra',
  'Caetano CB',
  'António Couceiro *',
  'DP Nunes',
  'H Cortes',
  'Zeca Belo',
  'Zé Ferreira',
  'João Lupi',
  'F.Cid',
  'Tocas',
  'M Romero',
  'Duarte Ávila*',
  'Rosiky',
  'V Trindade',
  'João Pissarra',
  'M Nunes',
  'Cabu',
  'André Bardzy',
  'L Moita',
  'Salvador Themudo*',
  'Fred CB',
  'Henrique Maia',
  'F Conceição',
  'Macedo',
  'M Leitão',
  'N Pina',
  'JB',
  'Diogo Brandão*',
  'Duarte Portela',
  'Francisco Jesus*',
  'Mandi',
  'Martim CDias*',
  'Lucas Lopez*',
  'Stor',
  'Manuel Gil *',
  'Guilherme Medeiros*',
  'M Arrobas',
  'Nuno Peixoto',
]

const ACCESS_ALIASES = {
  'a castineira': 'Afonso Castiñeira Correia',
  'a peixoto': 'António Peixoto',
  'a tapadinhas': 'Afonso Tapadinhas',
  'andre bardzy': 'Andre Bardziy',
  'antonio couceiro': 'António Couceiro',
  'd diniz': 'Duarte Diniz',
  'd torgal': 'Duarte Torgal',
  'david costa': 'David Costa Cheesy',
  'diogo brandao': 'Diogo Brandão',
  'dp nunes': 'Duarte Nunes',
  'duarte avila': 'Duarte Ávila',
  'f cid': 'Francisco Cid',
  'f conceicao': 'Francisco Conceição',
  'guilherme medeiros': 'Guilherme Medeiros',
  'h cortes': 'Henrique Cortes',
  'j dias': 'João Dias',
  'j granate': 'João Granate',
  'jf vital': 'João Vital',
  'jm lupi': 'José Lupi',
  'joaquim bustos': 'Joaquin Bustos',
  'juaco': 'Joaquin mihura',
  'l moita': 'Lourenço Moita',
  'm ferreira': 'Mateus Ferreira',
  'm nunes': 'Manuel Nunes',
  'm picao': 'Manuel Picão',
  'macedo': 'Luis Macedo',
  'manuel gil': 'Manuel Gil',
  'martim cdias': 'Martim CDias',
  'p ferreira': 'Pedro Ferreira',
  'salvador themudo': 'Salvador Themudo',
  'simao n': 'Simão Nunes',
}

export function normalizePlayerName(name) {
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[*.]/g, ' ')
    .replace(/[^a-zA-Z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ')
    .toLowerCase()
}

export function buildPlatformAccessSet(athletes) {
  const athleteByNormalized = new Map(
    athletes.map(athlete => [normalizePlayerName(athlete.name), athlete.name])
  )
  const names = new Set()

  RAW_PLATFORM_ACCESS_NAMES.forEach(rawName => {
    const normalized = normalizePlayerName(rawName)
    const canonical = ACCESS_ALIASES[normalized] || athleteByNormalized.get(normalized)
    if (canonical) names.add(canonical)
  })

  return names
}
