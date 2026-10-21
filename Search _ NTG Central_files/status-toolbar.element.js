customElements.define(
    'status-toolbar',
    class StatusToolbar extends HTMLElement {
        static observedAttributes = [
            'groups',
            'user-name',
            'global-site-url',
            'status-id' // default: page-status
        ]; 

        #handleClick = () => {}; // redeined bellow

        attributeChangedCallback(name, ov, nv) {
            if (!this.isConnected || ov === nv) return;
            this.setup();
        }

        connectedCallback() {
            this.setup(true);
        }

        disconnectedCallback() {
            this.setup(false);
        }

        setup(addEvents) {
            const statusId = this.getAttribute('status-id') ?? 'page-status';
            const $pageStatus = document.querySelector('#' + statusId);
            if (!$pageStatus) {
                console.info(`missing element #${statusId}`);
                return;
            }
            const {
                status, 
                asset, 
                permissions
            } = $pageStatus.dataset;
            
            const groups = JSON.parse(this.getAttribute('groups') ?? '[]');
            const userName = this.getAttribute('user-name') ?? '';
            const globalSiteUrl = this.getAttribute('global-site-url') ?? '';
            
            const actualPermissions = JSON.parse(permissions ?? '[]');
            const hasBackend = groups.some(p => actualPermissions.includes(p));

            let statusClass = '--status-default';
            let statusMsg = `<em>Logged in as </em> ${userName}`;

            switch (+status) {
                case 1:
                    statusClass = '--status-archive';
                    statusMsg = 'Archived';
                    break;
                case 2:
                    statusClass = '--status-construction';
                    statusMsg = 'Under Construction';
                    break;
                case 16:
                    statusClass = '--status-live';
                    statusMsg = 'Live';
                    break;
                case 64:
                    statusClass = '--status-safe';
                    statusMsg = 'Safe Editing';
                    break;
            }

            const innerMarkup = `
            <div class="st__tab">
                <button><span>${statusMsg}</span><i class="st__tools-icon-toggle fas fa-chevron-down float--right"></i></button>
            </div>
            <div class="st__tools">
                <ul class="st__tools-items">
                    <li>
                        <a href="#!assetid">Asset ID: ${asset}</a></li>
                    ${hasBackend
                        ? `<li><a href="/_nocache">Nocache</a></li>
                    <li><a href="/_recache">Recache</a></li>
                    <li><a href="#!new" target="_blank">New window</a></li>
                    <li><a href="/_admin">Admin</a></li>`
                        : ''
                    }
                    <li class="st__tools-logout">
                        <a href="${globalSiteUrl}/?SQ_ACTION=logout" onclick="window.location.href=this.href; return false;">Log out</a>
                    </li>
                </ul>
            </div>
            `;
            
            this.classList.add(statusClass);
            this.innerHTML = innerMarkup;
            /**
             * Events
             */
            if (typeof addEvents === 'boolean') {
                this.#handleClick = (e) => {
                    const tab = e.target.closest('.st__tab');
                    if (tab && !this.classList.contains('--open')) {
                        this.setAttribute('open', '');
                    } else {
                        this.removeAttribute('open');
                    }
                    const a = e.target.closest('.st__tools-items a');
           
                    if (a) {
                        e.preventDefault();
                        const href = a.href;
                        if (href.includes('#!new')) {
                            window.open(href.replace('#!new', ''));
                        }
                        if (href.includes('#!assetid')) {
                            navigator.clipboard.writeText(asset).then(() => {
                                this.setAttribute('tooltip', 'Asset ID copied');
                                setTimeout(() => {
                                    this.removeAttribute('tooltip');    
                                }, 2500);
                            }).catch(err => {
                                console.error('Failed to copy asset ID: ', err);
                            });  
                        }

                        let path = window.location.href
                            .replace(/(_nocache|_recache|_admin)$/, '')
                            .replace(/\/$/, '');
                        const [_segment] = href.match(/(_nocache|_recache|_admin)$/) ?? [''];
                     
                        if (_segment) {
                            path += '/' + _segment;
                            const { location: { hash, search }} = window;
                            window.history.pushState({path}, '', path + hash + search);
                            location.reload();
                        }
                        
                    }
                };
                const mode = addEvents ? 'add' : 'remove';
                document[mode + 'EventListener']('click', this.#handleClick);
            }
        }
    }
);