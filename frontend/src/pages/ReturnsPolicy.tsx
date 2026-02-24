import { PageLayout } from "../components/PageLayout";

export function ReturnsPolicy() {
  return (
    <PageLayout>
      <div className="max-w-2xl mx-auto py-6 px-4">
        <h1 className="text-2xl font-bold text-emerald-800 mb-4">Возвраты и претензии</h1>
        <div className="prose prose-slate max-w-none text-slate-700 space-y-4">
          <section>
            <h2 className="text-lg font-semibold text-slate-800">Сроки возврата</h2>
            <ul className="list-disc pl-6 space-y-1">
              <li>Возврат товара надлежащего качества: в течение <strong>14 дней</strong> с момента получения, если товар не был в употреблении, сохранён вид и упаковка.</li>
              <li>Товар ненадлежащего качества: претензия принимается в течение срока гарантии или срока годности.</li>
            </ul>
          </section>
          <section>
            <h2 className="text-lg font-semibold text-slate-800">Как оформить возврат или претензию</h2>
            <ol className="list-decimal pl-6 space-y-1">
              <li>Напишите в раздел «Обратная связь» на сайте, указав тему, номер заказа, описание ситуации и контактный телефон.</li>
              <li>Либо свяжитесь с нами по контактам поддержки, указанным на сайте.</li>
              <li>Мы рассмотрим обращение и свяжемся с вами в течение <strong>5 рабочих дней</strong>.</li>
            </ol>
          </section>
          <section>
            <h2 className="text-lg font-semibold text-slate-800">Условия</h2>
            <ul className="list-disc pl-6 space-y-1">
              <li>При возврате товара надлежащего качества покупатель оплачивает доставку обратно до продавца (если иное не согласовано).</li>
              <li>Деньги возвращаются тем же способом, которым была произведена оплата, в срок до 10 рабочих дней с момента принятия решения о возврате.</li>
            </ul>
          </section>
        </div>
      </div>
    </PageLayout>
  );
}
