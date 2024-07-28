import { createElement } from 'lwc';
import AccountNewCase from 'c/accountNewCase';


const navigateMock = jest.fn();

jest.mock(
    'lightning/navigation',
    () => {
        return {
            NavigationMixin: {
                Navigate: jest.fn(),
                GenerateUrl: jest.fn()
            }
        };
    },
    { virtual: true }
);

describe('c-account-new-case', () => {
    afterEach(() => {
        
        while (document.body.firstChild) {
            document.body.removeChild(document.body.firstChild);
        }
    });

    it('deve exibir o modal com os campos corretos para "Instalação de Antena"', async () => {
        const element = createElement('c-account-new-case', {
            is: AccountNewCase
        });

       
        element.loading = false;
        element.isInstallation = true;
        element.value = 'Instalação de Antena';
        element.recordTypesMap = { 'Instalação de Antena': 'Instalação de Antena' };

        document.body.appendChild(element);

      
        await Promise.resolve();

       
        const accountField = element.shadowRoot.querySelector('[data-field-name="accountId"]');
        const contactField = element.shadowRoot.querySelector('[data-field-name="contactId"]');
        const addressField = element.shadowRoot.querySelector('[data-field-name="addressId"]');

        expect(accountField).not.toBeNull();
        expect(contactField).not.toBeNull();
        expect(addressField).not.toBeNull();
    });

    it('deve exibir uma mensagem de erro se um campo obrigatório não estiver preenchido', async () => {
        const element = createElement('c-account-new-case', {
            is: AccountNewCase
        });

       
        element.loading = false;
        element.isInstallation = true;
        element.value = 'Instalação de Antena';
        element.recordTypesMap = { 'Instalação de Antena': 'Instalação de Antena' };

        document.body.appendChild(element);

        
        await Promise.resolve();

       
        const saveButton = element.shadowRoot.querySelector('lightning-button[label="Salvar"]');
        saveButton.click();

       
        await Promise.resolve();

        
        expect(element.shadowRoot.textContent).toContain('O campo Conta é obrigatório.');
    });

    it('deve navegar para a página de registro ao cancelar', async () => {
        const element = createElement('c-account-new-case', {
            is: AccountNewCase
        });

       
        element.recordId = '0031700000pJRRXAA4';

        document.body.appendChild(element);

       
        await Promise.resolve();

       
        const cancelButton = element.shadowRoot.querySelector('lightning-button[label="Cancelar"]');
        cancelButton.click();

        
        expect(navigateMock).toHaveBeenCalledWith({
            type: 'standard__recordPage',
            attributes: {
                recordId: '0031700000pJRRXAA4',
                actionName: 'view'
            }
        });
    });
});
