import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiFetch } from '../lib/api';

const topics = [
  { label: 'Как забронировать?', match: /брон|заказ|оформ/, answer: 'Откройте предложение, выберите количество и нажмите «Забронировать». Для оформления войдите в аккаунт. После бронирования заказ и код получения появятся во вкладке «Заказы».' },
  { label: 'Как оплатить?', match: /оплат|деньг|цен|карт/, answer: 'Оплата — в заведении при получении. Итоговая сумма указана в заказе. Онлайн-оплаты и доставки сейчас нет.' },
  { label: 'Где забрать?', match: /адрес|забрать|карт|самовывоз|где/, answer: 'Адрес и небольшая Google-карта находятся в карточке предложения. Приезжайте в указанное время самовывоза и покажите код получения сотруднику.' },
  { label: 'Как отменить?', match: /отмен|возврат/, answer: 'Откройте «Заказы» и нажмите «Отменить» у активного бронирования. Сделать это можно до окончания времени получения. Оплата происходит в заведении, поэтому деньги заранее не списываются.' },
  { label: 'Где код получения?', match: /код|номер/, answer: 'Код находится во вкладке «Заказы» рядом с активным бронированием. Новые коды состоят из 6 цифр. Покажите код сотруднику заведения при получении.' },
  { label: 'Не могу войти', match: /войти|вход|парол|аккаунт|регистр/, answer: 'Откройте «Профиль» и укажите почту или телефон, использованные при регистрации, и пароль. Проверьте раскладку клавиатуры. Никому не отправляйте свой пароль.' },
];

export default function Support() {
  const [messages, setMessages] = useState([{ role: 'bot', text: 'Здравствуйте! Я автоматический помощник Öbal. Выберите вопрос или напишите, с чем нужна помощь.' }]);
  const [text, setText] = useState('');
  const [telegram, setTelegram] = useState(null);
  const end = useRef(null);
  useEffect(() => { apiFetch('/support', { skipAuth: true }).then((data) => setTelegram(data.telegram_url)).catch(() => {}); }, []);
  useEffect(() => { end.current?.scrollIntoView({ block: 'nearest', behavior: 'instant' }); }, [messages]);
  function ask(value) {
    const question = value.trim();
    if (!question) return;
    const topic = topics.find((item) => item.label === question) || [...topics.slice(3), ...topics.slice(0, 3)].find((item) => item.match.test(question.toLowerCase()));
    const reply = topic?.answer || (telegram ? 'Для этого вопроса нужна помощь человека. Нажмите «Написать в Telegram», и бот передаст ваше обращение поддержке.' : 'Я могу помочь с бронированием, оплатой, отменой и получением заказа. Для личных обращений скоро появится Telegram-бот поддержки. Сейчас это сообщение не передаётся человеку.');
    setMessages((current) => [...current.slice(-38), { role: 'user', text: question }, { role: 'bot', text: reply }]);
    setText('');
  }
  return <div className="consumer-shell"><main className="simple-page support-page" id="main-content"><header className="page-head"><p className="page-head__date">Поможем разобраться</p><h1 className="large-title">Поддержка</h1></header>
    <p className="support-caption">Автоматический помощник · ответы на частые вопросы</p>
    {telegram && <a className="button support-telegram" href={telegram} target="_blank" rel="noreferrer">Написать в Telegram ↗</a>}
    <div className="support-topics" role="group" aria-label="Частые вопросы">{topics.map((topic) => <button key={topic.label} onClick={() => ask(topic.label)}>{topic.label}</button>)}</div>
    <div className="support-messages" role="log" aria-label="Чат с помощником" aria-live="polite" aria-relevant="additions">{messages.map((message, index) => <div key={index} className={`support-message support-message--${message.role}`}><strong>{message.role === 'bot' ? 'Помощник Öbal' : 'Вы'}</strong><p>{message.text}</p></div>)}<div ref={end}/></div>
    <form className="support-input" onSubmit={(e) => { e.preventDefault(); ask(text); }}><label className="sr-only" htmlFor="support-message">Ваш вопрос</label><input id="support-message" value={text} onChange={(e) => setText(e.target.value)} placeholder="Напишите ваш вопрос" maxLength={1000}/><button disabled={!text.trim()} aria-label="Отправить вопрос">↑</button></form>
    <p className="support-caption">Пароли и данные карты здесь не нужны.</p><Link className="link-button" to="/profile">Вернуться в профиль</Link>
  </main></div>;
}
