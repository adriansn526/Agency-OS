# Plan: situații pe toate categoriile (27.10.2026)

Contractul dat subagenților. Format: `categorie → [slug-uri de situații] + [ghiduri informative]`. Fiecare slug de situație din glosar este `<categorie>--<situație>`.

## acoperisuri (Acoperișuri și învelitori) — 5 situații
- Situații: `acoperis-terasa`, `jgheaburi-burlane`, `sarpanta`, `invelitoare-acoperis`, `izolatie-mansarda-acoperis`
- Ghiduri informative: –
- Analiză: [HUB_ACOPERISURI.md](HUB_ACOPERISURI.md)

## climatizare (Climatizare și ventilație) — 5 situații
- Situații: `montaj-aer-conditionat`, `curatare-igienizare-aer-conditionat`, `reparatii-service-aer-conditionat`, `ventilatie-recuperare-caldura`, `pompa-caldura-aer-aer`
- Ghiduri informative: –
- Analiză: [HUB_CLIMATIZARE.md](HUB_CLIMATIZARE.md)

## instalatii-electrice (Instalații electrice) — 4 situații
- Situații: `electricieni-autorizati-anre`, `tablou-electric`, `paratrasnet-priza-de-pamant`, `instalatie-electrica-casa`
- Ghiduri informative: –
- Analiză: [HUB_INSTALATII_ELECTRICE.md](HUB_INSTALATII_ELECTRICE.md)

## instalatii-sanitare (Instalații sanitare) — 2 situații
- Situații: `desfundare-canalizare`, `fosa-septica-statie-epurare`
- Ghiduri informative: –
- Analiză: [HUB_INSTALATII_SANITARE.md](HUB_INSTALATII_SANITARE.md)

## geamuri (Geamuri și vitraje) — 4 situații
- Situații: `reparatii-reglaj-termopane`, `usi-termopan`, `usi-culisante-glisante`, `rulouri-jaluzele-exterioare`
- Ghiduri informative: –
- Analiză: [HUB_GEAMURI.md](HUB_GEAMURI.md)

## garduri-pavaje (Garduri, pavaje și amenajări exterioare) — 5 situații
- Situații: `gard-metalic`, `gard-beton`, `beton-amprentat`, `pavaj-curte`, `poarta-culisanta-automatizare`
- Ghiduri informative: –
- Analiză: [HUB_GARDURI_PAVAJE.md](HUB_GARDURI_PAVAJE.md)

## fundatii-beton (Fundații și lucrări din beton) — 4 situații
- Situații: `fundatie-casa`, `sapa-mecanizata`, `sapa-autonivelanta`, `placa-beton-armat`
- Ghiduri informative: –
- Analiză: [HUB_FUNDATII_BETON.md](HUB_FUNDATII_BETON.md)

## pardoseli-placari (Pardoseli și placări) — 4 situații
- Situații: `pardoseala-epoxidica`, `montaj-parchet`, `montaj-gresie-faianta`, `microciment-poliuretan`
- Ghiduri informative: –
- Analiză: [HUB_PARDOSELI_PLACARI.md](HUB_PARDOSELI_PLACARI.md)

**Total: 8 categorii, 33 situații, 0 ghiduri noi.**

## Categorii lăsate în afara acestui val
- `hidroizolatii`: are deja hubul (3 situații + 3 ghiduri).
- `inchideri-balcoane-sticla`: pilonul este necomis în checkout-ul partajat (altă sesiune); nu există în `origin/main`. Cerere găsită: închidere terasă (2.400), închidere balcon (720), închidere terasă cu folie (720). De reluat după ce pilonul ajunge în `main`.
- Categorii fără pilon scris în `origin/main` (`izolatii-termice`, `renovari-amenajari-interioare`, `case-modulare`, `terase-pergole-foisoare`, `ventilatie-industriala`, `sticla-ghilotina`, `instalatii-termice`, `ipsoserie-gips-carton`, `zugraveli-vopsitorie`, `tamplarie-dulgherie` etc.): o situație nu are unde fi legată (blocul `situation_links` stă în pilon), iar scrierea pilonilor nu intră în acest val. Dintre ele, au cerere vizibilă în datele existente: izolații termice, zugrăveli, centrale termice (montaj centrală termică: 590) și renovare baie (390).
- Categorii fără cerere de consum (drumuri, căi ferate, poduri, foraj, dezvoltare imobiliară etc.): rămân fără pagini.
- Termeni lăsați afară deliberat (produse, volum mic sau altă categorie): plasă de gard ca produs, iluminat exterior (lămpi solare), pompă de recirculare, fosă septică ca produs (Dedeman), kituri de aer condiționat, scări pentru pod (produs), gard lemn/WPC (1.600/2.400; candidat pentru un val ulterior).
