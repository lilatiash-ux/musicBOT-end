MUSICDROP MONITOR — instrukcja Wispbyte

1. Zrób kopię swojej obecnej zawartości folderu data/ przed podmianą plików.
2. Wgraj pliki z ZIP-a do katalogu bota. Nie nadpisuj własnych plików data/*.json, jeśli zawierają historię.
3. W Wispbyte ustaw zmienną środowiskową DISCORD_TOKEN z tokenem bota. Nie wpisuj tokena do publicznego repozytorium.
4. Ustaw komendę startową: npm start (uruchamia node index.js; bootstrap.js nie jest używany).
5. Upewnij się, że bot ma dostęp do skonfigurowanych kanałów i uprawnienia do wysyłania wiadomości oraz embedów.

Ważne:
- MusicDrop wykorzystuje endpointy kolekcji Shopify.
- Sklepy zewnętrzne są monitorowane metodą best-effort przez wyszukiwarki sklepów i dane Product JSON-LD/karty produktów. Część stron może blokować zapytania lub zmieniać HTML; błędy są logowane i nie powinny zatrzymać monitoringu MusicDrop.
- Wyszukiwanie sklepów muzycznych rotuje frazy między cyklami, aby ograniczyć liczbę zapytań. Nie oznacza to pełnego indeksowania wszystkich katalogów w każdym 5-minutowym cyklu.
- Pierwszy cykl zapisuje znalezione produkty jako stan początkowy i nie wysyła alertów o starych produktach.
- Dane produktów, cen i historii są zapisywane w data/.
