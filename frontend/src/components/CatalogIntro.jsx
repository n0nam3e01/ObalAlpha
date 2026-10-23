import { Icon } from './Layout';

export default function CatalogIntro({ discovery }) {
  return <header className={`catalog-intro${discovery ? ' catalog-intro--search' : ''}`}>
    <div className="catalog-intro__copy">
      <p className="catalog-kicker"><span/> Сегодня в Астане</p>
      <h1>{discovery ? 'Найдите что-нибудь вкусное' : <>Хорошая еда.<br/><span>Без лишних трат.</span></>}</h1>
      <p>Наборы из заведений со скидкой.<br className="desktop-break"/> Бронируйте онлайн, забирайте по пути.</p>
      <div className="catalog-promises"><span><Icon name="bag" size={16}/>Самовывоз</span><span><Icon name="check" size={16}/>Оплата в заведении</span></div>
    </div>
    {!discovery && <div className="catalog-art" aria-hidden="true">
      <div className="catalog-art__orbit"/>
      <svg viewBox="0 0 260 230" className="catalog-art__bag">
        <path d="M85 71 68 26Q65 12 80 12q9 0 15 12l25 49" className="art-bread"/>
        <path d="m75 29 13-5m-7 21 14-5m-7 21 13-5" className="art-line"/>
        <path d="M145 78q-18-47 13-59 20 22 6 58M158 24l-7 50" className="art-leaf"/>
        <path d="m59 76 17-12 17 12 17-12 17 12 17-12 17 12 17-12 17 12 9 130q-74 24-153 0Z" className="art-paper"/>
        <path d="M94 95v13q0 35 34 35t34-35V95" className="art-handle"/>
        <text x="128" y="184" textAnchor="middle">öbal</text>
        <path d="m54 204 10-98m133 98-8-98" className="art-fold"/>
      </svg>
      <span className="catalog-art__note"><Icon name="leaf" size={18}/>Меньше потерь.<br/>Больше вкусного.</span>
    </div>}
  </header>;
}

export function CatalogEmpty({ filtered, reset, refresh, supportUrl, supportName }) {
  return <section className="catalog-empty" aria-labelledby="catalog-empty-title">
    <div className="catalog-empty__symbol" aria-hidden="true"><Icon name={filtered ? 'search' : 'bag'} size={32}/></div>
    <div className="catalog-empty__copy"><p className="catalog-kicker">{filtered ? 'Попробуем по-другому' : 'Хорошему нужно немного времени'}</p>
      <h2 id="catalog-empty-title">{filtered ? 'Нет подходящих наборов' : 'Сегодня предложений пока нет'}</h2>
      <p>{filtered ? 'Попробуйте другой район, категорию или цену. Возможно, ваш набор совсем рядом.' : 'Заведения публикуют наборы, когда знают, что осталось. Загляните позже — здесь появится что-нибудь вкусное.'}</p>
      <div className="catalog-empty__actions"><button className="catalog-primary" onClick={filtered ? reset : refresh}><Icon name={filtered ? 'search' : 'refresh'} size={17}/>{filtered ? 'Сбросить фильтры' : 'Обновить предложения'}</button><a href={supportUrl} target="_blank" rel="noreferrer">Спросить в {supportName}<Icon name="external" size={16}/></a></div>
    </div>
  </section>;
}

export function CatalogSteps() {
  return <section className="catalog-steps" aria-label="Как работает Öbal">{[
    ['01', 'Выберите набор', 'Посмотрите состав, цену и время выдачи.'],
    ['02', 'Забронируйте онлайн', 'Набор будет ждать вас в заведении.'],
    ['03', 'Заберите по пути', 'Покажите код заказа и оплатите на месте.'],
  ].map(([number, title, text]) => <div key={number}><span>{number}</span><div><h3>{title}</h3><p>{text}</p></div></div>)}</section>;
}
