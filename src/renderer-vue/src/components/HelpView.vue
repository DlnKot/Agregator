<template>
  <div class="help-container">
    <div class="help-tabs">
      <button v-for="tab in tabs" :key="tab.id" class="help-tab" :class="{ active: activeTab === tab.id }"
        @click="activeTab = tab.id">
        {{ tab.label }}
      </button>
    </div>

    <div class="help-content">
      <!-- HelpDesk -->
      <div v-if="activeTab === 'helpdesk'" class="help-section">
        <h2>HelpDesk — служба поддержки</h2>

        <div class="help-block">
          <h3>Как позвонить в поддержку?</h3>
          <ul class="contact-list">
            <li><strong>По внутреннему телефону:</strong> 011-1111</li>
            <li><strong>С мобильного:</strong> 8 800 303 1111</li>
          </ul>
        </div>

        <div class="help-block">
          <h3>Как создать обращение в Outlook:</h3>
          <ol class="steps-list">
            <li>Нажми на «Обращение в Helpdesk» в Outlook.</li>
            <li>Выбери из выпадающего списка шаблон.</li>
            <li>Заполни все поля. Они помогут лучше понять вопрос.</li>
            <li>Нажми «Отправить».</li>
          </ol>
        </div>

        <div class="help-block important">
          <h3>ВАЖНО!!!</h3>
          <p>Если в Outlook нет кнопки «Обращение в Helpdesk», то нажми на «Создать сообщение» и направь письмо на адрес
            <strong>helpdesk@alfabank.ru</strong>.
          </p>
          <p>В письме опиши подробно суть обращения и не забудь добавить скриншот во вложение.</p>
        </div>
      </div>

      <!-- Indeed -->
      <div v-if="activeTab === 'indeed'" class="help-section">
        <h2>Indeed — одноразовый код</h2>

        <div class="help-block">
          <p class="description">Indeed – одноразовый код, с помощью которого вы можете подключиться к сервисам банка.
          </p>
        </div>

        <div class="help-block">
          <h3>Как получить код через приложение Indeed Key Authenticator:</h3>
          <ol class="steps-list">
            <li>Установите Indeed Key Authenticator для <strong>IOS</strong></li>
            <li>Нажмите на шестерёнку, чтобы получить ID.</li>
            <li>Скопируйте ID устройства. <a href="#" class="link"
                @click.prevent="openLink('https://alfapeople.alfabank.ru/faq/tree/topic/25-indeed-kod')">Подробнее
                здесь</a></li>
            <li>Зайдите на портал Alfa People, где необходимо авторизоваться:</li>
            <li class="sub-step">- Введите рабочую почту в формате ****@alfabank.ru</li>
            <li class="sub-step">- Подтвердите номер телефона кодом из сообщения</li>
            <li class="sub-step">- Введите пароль от учётной записи</li>
            <li>Наведите или нажмите на иконку Личного профиля и выберите <strong>Indeed код</strong>.</li>
            <li>Зарегистрируйте Indeed в Alfa People, нажав "Создать аутентификатор."</li>
            <li>Введите Пароль от учетной записи.</li>
            <li>Внесите ID устройства, который Вы копировали в приложении Indeed Key.</li>
            <li>Вернитесь в приложение Indeed Key, чтобы закончить регистрацию: нажмите на плюс в правом верхнем углу
              приложения</li>
            <li>Отсканируйте QR-код.</li>
            <li>Если вы проходите регистрацию с телефона, перейдите по ссылке. Дополнительно вы получите письмо со
              ссылкой для активации.</li>
          </ol>
        </div>

        <div class="help-block">
          <p>Готово! Теперь приложение Indeed Key генерирует одноразовые коды каждые 30 секунд.</p>
          <a href="#" @click.prevent="openLink('https://alfapeople.alfabank.ru/faq/tree/topic/25-indeed-kod')"
            class="link">Инструкция со скриншотами на Alfa People</a>
        </div>
      </div>

      <!-- Виды удаленки -->
      <div v-if="activeTab === 'remote-types'" class="help-section">
        <h2>Виды удалённых рабочих мест</h2>

        <!-- VDI -->
        <div class="help-block">
          <h3>Виртуальная машина «VDI» (VMware Horizon Client)</h3>
          <p>Это полный аналог физической рабочей станции.</p>

          <p><strong>Для доступа:</strong> нужно заполнить универсальную ИТ-заявку «Рабочее место сотрудника VDI
            VMware».</p>

          <div class="features-box">
            <h4>Основные возможности:</h4>
            <ul>
              <li>Самостоятельная установка ПО из «Центра программного обеспечения»</li>
              <li>Получение права локального администратора</li>
              <li>Привязки IP-адреса к MAC-адресу по дополнительным заявкам</li>
            </ul>
          </div>

          <p>Инструкции по настройке VDI находятся на порталах <strong>Alfa People</strong> и <strong>Alfa
              Book</strong>.</p>

          <div class="info-box">
            <p>Вне сети банка доступно по ссылке. Код доступа: <code>h6StZ6@1</code></p>
          </div>
        </div>

        <!-- ПУРМС -->
        <div class="help-block">
          <h3>ПУРМС</h3>
          <p>Это полноценное удалённое рабочее место сотрудника, которое даёт доступ к рабочему столу, корпоративной
            почте и практически ко всем системам, в которых сотрудники банка могут работать удалённо.</p>

          <p><strong>Для доступа:</strong> нужно заполнить <a href="#"
              @click.prevent="openLink('https://itservice/form-group-view/576c0b93-bbac-4595-bfa1-8ea7ef4eef38?formNum=IT0212')">универсальную
              ИТ-заявку</a>.</p>

          <div class="features-box">
            <h4>Возможности:</h4>
            <ul>
              <li>Доступ к рабочему столу, почте и большинству систем</li>
              <li>Базовый набор приложений из корпоративного стандарта ПО</li>
              <li>Возможность подключения к офисному ПК без прав администратора</li>
            </ul>
          </div>

          <div class="warning-box">
            <h4>На ПУРМС недоступны:</h4>
            <ul>
              <li>Архив почты на рабочей станции</li>
              <li>Криптография (Crypto Pro) — запрещена на терминальных решениях</li>
              <li>Печать документов с личных принтеров</li>
              <li>Работа с USB-накопителями и устройствами (флешки)</li>
            </ul>
          </div>

          <p>Инструкции по настройке ПУРМС находятся на порталах <strong>Alfa People</strong> и <strong>Alfa
              Book</strong>.</p>

          <div class="info-box">
            <p>Вне сети банка доступно по ссылке. Пароль для доступа: <code>MyWxq8@7</code></p>
          </div>
        </div>

        <!-- CITRIX -->
        <div class="help-block">
          <h3>CITRIX</h3>
          <p>Удалённая работа по протоколу ICA на серверах и виртуальных машинах. На рабочем месте должен быть
            установлен Citrix receiver и предоставлен сетевой доступ.</p>

          <p><strong>Для доступа:</strong> нужно заполнить заявку «Терминальное рабочее место сотрудника через CITRIX».
          </p>

          <p>Инструкции по настройкам CITRIX находятся на порталах <strong>Alfa People</strong> и <strong>Alfa
              Book</strong>.</p>

          <div class="citrix-types">
            <div class="citrix-type">
              <h4>CITRIX-CC (ЦПК)</h4>
              <p>Сервис для удалённого подключения к системам для работы с опубликованными приложениями операторов
                контакт-центров.</p>
              <p>Подключение через <strong>MYCC.alfabank.ru</strong></p>
            </div>

            <div class="citrix-type">
              <h4>CITRIX-RIT</h4>
              <p>Сервис для удалённого подключения к рабочей станции с правами локального администратора.</p>
              <p>Подключение через сайт <strong>http://sf-rit</strong></p>
            </div>

            <div class="citrix-type">
              <h4>CITRIX CC-EXTENDED / CITRIX VDI</h4>
              <p>Сервис с индивидуальным рабочим местом. Виртуальные машины удаляются после выхода, данные сохраняются.
              </p>
              <p>Доступен как в банке, так и дома.</p>
            </div>

            <div class="citrix-type">
              <h4>CITRIX-DVPZ</h4>
              <p>Система для сотрудников департамента взыскания.</p>
            </div>

            <div class="citrix-type">
              <h4>CITRIX SmartBranch</h4>
              <p>Система для сотрудников офисов SmartBranch.</p>
              <p>Доступ только к разрешённым сайтам, только к дискам P и S.</p>
            </div>
          </div>
        </div>

        <!-- VPN -->
        <div class="help-block">
          <h3>VPN (CheckPoint)</h3>
          <p>Удалённый доступ к системам банка через VPN позволяет открывать ресурсы на своём устройстве, подключив
            CheckPoint к адресу <strong>mypc.alfabank.ru</strong>.</p>

          <p><strong>Для доступа:</strong> нужно заполнить ИТ-заявку «Удалённый доступ к системам банка через VPN».</p>

          <div class="warning-box">
            <p>Настройка чекпоинта стандартная к адресу mypc.alfabank.ru. Обратитесь в IT Support для получения учётных
              данных.</p>
            <p style="margin-top: 8px;">Такой доступ не позволяет менять пароль от учётной записи через ПК. Только через
              другие типы удалённого
              доступа или Alfa People на телефоне.</p>
          </div>
        </div>

        <!-- Jira/Confluence -->
        <div class="help-block">
          <h3>Jira / Confluence</h3>
          <p><strong>Jira</strong> — инструмент управления проектами, который помогает оптимизировать работу команды.
          </p>
          <p><strong>Confluence</strong> — система для создания страниц, документов и обмена контентом.</p>

          <p><strong>Для доступа:</strong> необходимо оформить Универсальную заявку на доступ и выбрать "Jira,
            Confluence, Bitbucket, GIT, Stash"</p>

          <div class="links-box">
            <a href="#" @click.prevent="openLink('http://jira.moscow.alfaintra.net')">Jira</a>
            <a href="#" @click.prevent="openLink('http://confluence.moscow.alfaintra.net')">Confluence</a>
          </div>
        </div>
      </div>

      <!-- Чатбот -->
      <div v-if="activeTab === 'chatbot'" class="help-section">
        <h2>Чат-бот IT Helps</h2>

        <div class="help-block">
          <p class="description">
            Чат-бот IT Helps — чат-бот технической поддержки, который быстро ищет информацию по запросу, помогает с
            возникшей проблемой и создаёт обращения, которые сразу направляются в HelpDesk.
            <strong>Он предназначен для внутреннего использования сотрудниками.</strong>
          </p>
        </div>

        <div class="help-block">
          <h3>Как общаться с ботом:</h3>
          <ol class="steps-list">
            <li>Открой Чат-бот IT Helps через ярлык на рабочем столе или в трее возле часов.</li>
            <li>В появившемся окне опиши свою проблему.</li>
            <li>Задавай вопросы по очереди: сначала дождись ответа на один вопрос, а потом задай другой.</li>
            <li>При общении с ботом задавай вопрос кратко, при создании обращения опиши обращение подробно.</li>
          </ol>
        </div>

        <div class="help-block">
          <h3>Ещё чат-бот умеет:</h3>
          <ul class="features-list">
            <li>Менять пароль</li>
            <li>Сбрасывать сессии Citrix</li>
            <li>Подключать и перезагружать принтеры</li>
            <li>Очищать диск С или кэш браузера</li>
            <li>Восстанавливать Outlook</li>
            <li>Заказывать рабочую технику и многое другое</li>
          </ul>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch } from 'vue'

const tabs = [
  { id: 'helpdesk', label: 'HelpDesk' },
  { id: 'indeed', label: 'Indeed' },
  { id: 'remote-types', label: 'Виды удаленки' },
  { id: 'chatbot', label: 'Чатбот' }
]

const activeTab = ref('helpdesk')

// Трекинг метрик при смене вкладки
watch(activeTab, (newTab) => {
  if (window.api?.trackHelpView) {
    window.api.trackHelpView(newTab)
  }
}, { immediate: true })

function openLink(url) {
  if (window.api?.openExternal) {
    window.api.openExternal(url)
  } else {
    // Fallback for browser
    window.open(url, '_blank')
  }
}
</script>

<style scoped>
.help-container {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
  background: var(--bg-primary);
  border-radius: 30px;
  padding: 20px;
  overflow: hidden;
}

.help-tabs {
  display: flex;
  gap: 8px;
  margin-bottom: 24px;
  padding: 4px;
  background: var(--bg-secondary);
  border-radius: var(--radius-xl);
  width: fit-content;
  flex-wrap: wrap;
}

.help-tab {
  padding: 10px 20px;
  border: none;
  background: transparent;
  color: var(--text-primary);
  opacity: 0.8;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  border-radius: 25px;
  transition: var(--transition);
  white-space: nowrap;
}

.help-tab:hover {
  color: var(--text-inverse);
  background: var(--bg-tertiary);
}

.help-tab.active {
  background: var(--bg-tertiary);
  color: var(--text-inverse);
  opacity: 1;
}

.help-content {
  flex: 1;
  overflow-y: auto;
  min-height: 200px;
}

.help-section h2 {
  font-size: 20px;
  font-weight: 600;
  margin-bottom: 20px;
  color: var(--text-primary);
}

.help-section h3 {
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary);
  margin-top: 16px;
  margin-bottom: 12px;
}

.help-section h3:first-child {
  margin-top: 0;
}

.help-section h4 {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 8px;
}

.help-section p {
  font-size: 14px;
  color: var(--text-secondary);
  line-height: 1.6;
  margin-bottom: 8px;
}

.help-block {
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-lg);
  padding: 20px;
  margin-bottom: 16px;
}

.help-block h3 {
  margin-top: 0;
}

.help-block.important {
  border-color: rgba(239, 68, 68, 0.4);
  background: rgba(239, 68, 68, 0.08);
}

.help-block.important h3 {
  color: #ef4444;
}

.description {
  font-size: 15px !important;
  color: var(--text-primary) !important;
}

.contact-list {
  list-style: none;
  padding: 0;
  margin: 0;
}

.contact-list li {
  padding: 8px 0;
  font-size: 14px;
  color: var(--text-secondary);
  border-bottom: 1px dashed var(--border-color);
}

.contact-list li:last-child {
  border-bottom: none;
}

.contact-list strong {
  color: var(--text-primary);
}

.steps-list {
  padding-left: 20px;
  margin: 0;
}

.steps-list li {
  padding: 6px 0;
  font-size: 14px;
  color: var(--text-secondary);
  line-height: 1.5;
}

.steps-list li.sub-step {
  padding-left: 16px;
  font-size: 13px;
  color: var(--text-muted);
}

.features-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 8px;
}

.features-list li {
  padding: 8px 12px;
  background: var(--bg-primary);
  border-radius: var(--radius-sm);
  font-size: 13px;
  color: var(--text-primary);
  display: flex;
  align-items: center;
  gap: 8px;
}

.features-list li::before {
  content: "✓";
  color: #22c55e;
  font-weight: bold;
}

.features-box {
  background: rgba(59, 130, 246, 0.1);
  border: 1px solid rgba(59, 130, 246, 0.3);
  border-radius: var(--radius-md);
  padding: 16px;
  margin: 12px 0;
}

.features-box ul {
  margin: 0;
  padding-left: 20px;
}

.features-box li {
  font-size: 13px;
  color: var(--text-secondary);
  margin-bottom: 4px;
}

.info-box {
  background: rgba(34, 197, 94, 0.1);
  border: 1px solid rgba(34, 197, 94, 0.3);
  border-radius: var(--radius-md);
  padding: 12px 16px;
  margin: 12px 0;
}

.info-box p {
  margin: 0;
  color: var(--text-primary);
  font-size: 14px;
}

.info-box code {
  background: rgba(0, 0, 0, 0.3);
  padding: 4px 10px;
  border-radius: 4px;
  font-family: monospace;
  color: var(--text-primary);
  font-weight: 500;
  letter-spacing: 0.3px;
}

.warning-box code {
  background: rgba(0, 0, 0, 0.3);
  padding: 4px 10px;
  border-radius: 4px;
  font-family: monospace;
  color: var(--text-primary);
  font-weight: 500;
  letter-spacing: 0.3px;
}

.warning-box {
  background: rgba(245, 158, 11, 0.1);
  border: 1px solid rgba(245, 158, 11, 0.3);
  border-radius: var(--radius-md);
  padding: 12px 16px;
  margin: 12px 0;
}

.warning-box h4 {
  color: #f59e0b;
}

.warning-box ul {
  margin: 8px 0 0 0;
  padding-left: 20px;
}

.warning-box li {
  font-size: 13px;
  color: var(--text-secondary);
}

.citrix-types {
  display: grid;
  gap: 12px;
  margin-top: 16px;
}

.citrix-type {
  background: var(--bg-primary);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  padding: 14px;
}

.citrix-type h4 {
  color: var(--accent-danger);
  font-size: 14px;
  margin-bottom: 6px;
}

.citrix-type p {
  font-size: 13px;
  margin-bottom: 4px;
}

.links-box {
  display: flex;
  gap: 12px;
  margin-top: 16px;
  flex-wrap: wrap;
}

.link,
.links-box a {
  color: var(--text-inverse);
  text-decoration: none;
  padding: 8px 14px;
  background: rgba(59, 130, 246, 0.85);
  border-radius: var(--radius-lg);
  font-size: 13px;
  font-weight: 600;
  display: inline-flex;
  align-items: center;
  transition: var(--transition);
  border: 1px solid rgba(59, 130, 246, 0.95);
}

.link:hover,
.links-box a:hover {
  background: rgba(59, 130, 246, 1);
  border-color: rgba(59, 130, 246, 1);
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
}
</style>
