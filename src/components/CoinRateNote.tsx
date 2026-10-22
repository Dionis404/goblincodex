/**
 * Подпись под суммами, где монеты переведены во Flower по курсу монет
 * (useCoinRate) — со ссылкой на раздел «Курс монет». Ссылка относительная:
 * на основном домене /codex уводит на sfl.* (middleware), там она своя.
 */
export default function CoinRateNote({
  rate,
  className = 'ref-coin-note',
}: {
  rate: number | null | undefined;
  /** ref-coin-note — в справочнике; на /tools/* — gc-calc-note из calculator.css. */
  className?: string;
}) {
  if (rate === undefined) return null;
  return (
    <p className={className}>
      {rate
        ? <>Монеты переведены во Flower по курсу монет <strong>1 Flower ≈ {Math.round(rate).toLocaleString('ru-RU')} монет</strong> (через урожай у Бетти). </>
        : <>Курс монет сейчас недоступен — монеты во Flower не переведены. </>}
      <a href="/codex?tab=mechanics&amp;ref=coins">Курс монет →</a>
    </p>
  );
}
