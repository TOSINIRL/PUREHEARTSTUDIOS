// Progressive enhancement: keep the original select for validation and FormData.
(() => {
    const select = document.querySelector('#service');
    if (!select) return;
    const modal = document.querySelector('#bookingModal');
    const label = document.querySelector('label[for="service"]');
    const wrapper = document.createElement('div');
    wrapper.className = 'service-picker';
    select.before(wrapper);
    wrapper.append(select);

    const trigger = document.createElement('button');
    trigger.type = 'button';
    trigger.className = 'service-picker-trigger';
    trigger.id = 'service-picker-trigger';
    trigger.setAttribute('role', 'combobox');
    trigger.setAttribute('aria-label', 'Choose a service');
    trigger.setAttribute('aria-haspopup', 'listbox');
    trigger.setAttribute('aria-expanded', 'false');
    trigger.setAttribute('aria-controls', 'service-picker-list');
    const value = document.createElement('span');
    value.id = 'service-picker-value';
    trigger.setAttribute('aria-describedby', value.id);
    trigger.append(value);

    const list = document.createElement('div');
    list.className = 'service-picker-list';
    list.id = 'service-picker-list';
    list.setAttribute('role', 'listbox');
    list.setAttribute('aria-label', 'Hair services');
    list.hidden = true;
    const options = Array.from(select.options).filter(option => option.value);
    let activeIndex = 0;
    let search = '';
    let searchTimer;

    const setActive = index => {
        activeIndex = (index + options.length) % options.length;
        Array.from(list.children).forEach((item, i) => {
            item.dataset.active = String(i === activeIndex);
        });
        if (!list.hidden) {
            trigger.setAttribute('aria-activedescendant', list.children[activeIndex].id);
            list.children[activeIndex].scrollIntoView({ block: 'nearest' });
        }
    };
    const sync = () => {
        value.textContent = select.selectedOptions[0]?.textContent || 'Select a service';
        Array.from(list.children).forEach((item, i) => {
            item.setAttribute('aria-selected', String(options[i].value === select.value));
        });
    };
    const close = () => {
        list.hidden = true;
        trigger.setAttribute('aria-expanded', 'false');
        trigger.removeAttribute('aria-activedescendant');
        search = '';
        clearTimeout(searchTimer);
    };
    const open = () => {
        sync();
        list.hidden = false;
        trigger.setAttribute('aria-expanded', 'true');
        setActive(Math.max(0, options.findIndex(option => option.value === select.value)));
    };
    const choose = index => {
        select.value = options[index].value;
        select.dispatchEvent(new Event('input', { bubbles: true }));
        select.dispatchEvent(new Event('change', { bubbles: true }));
        close();
        trigger.focus({ preventScroll: true });
    };

    options.forEach((option, index) => {
        const item = document.createElement('div');
        item.id = `service-picker-option-${index}`;
        item.className = 'service-picker-option';
        item.setAttribute('role', 'option');
        item.setAttribute('aria-label', option.textContent);
        item.style.setProperty('--option-index', String(index));
        item.textContent = option.textContent;
        item.addEventListener('pointermove', () => setActive(index));
        item.addEventListener('click', () => choose(index));
        list.append(item);
    });
    wrapper.append(trigger, list);
    select.classList.add('service-picker-native');
    select.tabIndex = -1;
    select.setAttribute('aria-hidden', 'true');
    sync();

    trigger.addEventListener('click', () => list.hidden ? open() : close());
    list.addEventListener('mousedown', event => event.preventDefault());
    trigger.addEventListener('keydown', event => {
        if (event.key === 'Escape' && !list.hidden) {
            event.preventDefault();
            event.stopPropagation(); // First Escape closes this menu, not the dialog.
            close();
        } else if (event.key === 'Tab') {
            close();
        } else if (['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) {
            event.preventDefault();
            if (list.hidden) {
                open();
                if (event.key === 'Home') setActive(0);
                if (event.key === 'End') setActive(options.length - 1);
            } else {
                setActive(event.key === 'Home' ? 0 : event.key === 'End' ? options.length - 1 :
                    activeIndex + (event.key === 'ArrowDown' ? 1 : -1));
            }
        } else if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            if (list.hidden) open();
            else choose(activeIndex);
        } else if (event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey) {
            event.preventDefault();
            if (list.hidden) open();
            clearTimeout(searchTimer);
            search += event.key.toLowerCase();
            const match = options.findIndex(option => option.textContent.toLowerCase().startsWith(search));
            if (match >= 0) setActive(match);
            searchTimer = setTimeout(() => { search = ''; }, 700);
        }
    });
    document.addEventListener('pointerdown', event => {
        if (!wrapper.contains(event.target)) close();
    });
    trigger.addEventListener('blur', close);
    select.addEventListener('change', sync);
    select.addEventListener('invalid', event => {
        event.preventDefault();
        trigger.focus({ preventScroll: true });
        open();
    });
    label?.addEventListener('click', event => {
        event.preventDefault();
        trigger.focus();
    });
    select.form?.addEventListener('reset', () => {
        close();
        setTimeout(sync, 0);
    });
    new MutationObserver(() => {
        close();
        sync();
    }).observe(modal, { attributes: true, attributeFilter: ['class'] });
})();
