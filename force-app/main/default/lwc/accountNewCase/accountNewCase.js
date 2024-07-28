import { LightningElement, api, wire, track } from 'lwc';
import { CurrentPageReference } from 'lightning/navigation';
import getCaseRecordTypes from '@salesforce/apex/AccountNewCaseController.getCaseRecordTypes';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import { RefreshEvent } from 'lightning/refresh';
import findByAddressAccount from '@salesforce/apex/AccountNewCaseController.findByAddressAccount';
import createCase from '@salesforce/apex/AccountNewCaseController.createCase';
import createAdress from '@salesforce/apex/AccountNewCaseController.createAdress';
import { CloseActionScreenEvent } from "lightning/actions";


export default class AccountNewCase extends LightningElement {
    @api recordId;
    @api
    get zipCode() {
        return this._zipCode;
    }

    set zipCode(value) {
        if (!value) return;
        this._zipCode = value;
    }

    @track hideFooter = false;
    @track loading = true;
    @track addressOptions = [];
    @track addresses = [];

    value = '';
    recordTypeOptions = [];
    recordTypesMap = {};
    recordTypeIdsMap = {};

    isInstallation = false;
    isTechnicalVisit = false;
    isAddressChange = false;

    accountId;
    contactId;
    addressId;

    number;
    street;
    state;
    city;
    cities;
    additionalInfo;

    accountCase = {};
    address = {};

    @wire(getCaseRecordTypes)
    wiredRecordTypes({ error, data }) {
        if (data) {
            this.recordTypeOptions = data
                .filter(rt => rt.developerName !== 'Master')
                .map(rt => {
                    this.recordTypesMap[rt.developerName] = rt.label;
                    this.recordTypeIdsMap[rt.developerName] = rt.id;
                    return { label: rt.label, value: rt.developerName };
                });
            this.loading = false;
        } else if (error) {
            console.error('Error fetching record types:', error);
            this.loading = false;
        }
    }

    @wire(CurrentPageReference)
    pageRef;

    connectedCallback() {
        this.accountId = this.pageRef.state.recordId;
        if (this.accountId) {
            this.loadAddresses();
        }
    }

    loadAddresses() {
        findByAddressAccount({ accountId: this.accountId })
            .then(result => {
                if (result) {
                    this.addressOptions = result.map(address => ({
                        label: `${address.Address__Street__s}, ${address.Address__City__s} - ${address.Address__PostalCode__s}`,
                        value: address.Id
                    }));
                }
            })
            .catch(error => {
                console.error('Error fetching addresses:', error);
            });
    }

    handleChangeField(event) {
        console.log(event);
        this[event.target.dataset.fieldName] = event.target.value;
    }

    handleAdd(event) {
        this.addresses.push({
            sequence: this.addresses.length,
            zipCode: this.zipCode,
            street: this.street,
            state: this.state,
            city: this.city
        });
    }

    handleCase() {
        this.dispatchEvent(new CloseActionScreenEvent());
      }

    
    
    handleChangedAddress(event) {
        this.zipCode = event.detail.zipCode;
        this.street = event.detail.street;
        this.state = event.detail.state;
        this.city = event.detail.city;

        this.publishAddressFound();
    }

    publishAddressFound() {
        let address = {
            zipCode: this.zipCode,
            street: this.street,
            state: this.state,
            city: this.city
        }

        this.dispatchEvent(new CustomEvent('addressfound', {
            detail: address
        }));
    }

    handleAddressChange(event) {
        this.addressId = event.detail.value;
        const selectedAddress = this.addressOptions.find(address => address.value === this.addressId);
        this.address = selectedAddress ? selectedAddress.label : '';
    }

    handleChange(event) {
        this.value = event.detail.value;
        const recordTypeName = this.recordTypesMap[this.value];
        

        const recordTypeSettings = {
            'Instalação de Antena': { isInstallation: true, isTechnicalVisit: false, isAddressChange: false },
            'Visita Técnica': { isInstallation: false, isTechnicalVisit: true, isAddressChange: false },
            'Troca de Endereço de Instalação': { isInstallation: false, isTechnicalVisit: false, isAddressChange: true }
        };

        const settings = recordTypeSettings[recordTypeName] || { isInstallation: false, isTechnicalVisit: false, isAddressChange: false };

        this.isInstallation = settings.isInstallation;
        this.isTechnicalVisit = settings.isTechnicalVisit;
        this.isAddressChange = settings.isAddressChange;
    }

    handleInputChange(event) {
        const field = event.target.name;
        this.accountCase[field] = event.target.value;

        if (this.isAddressChange) {
            this.address[field] = event.target.value;
        }
    }

    handleChangeLookup(event) {
        this[event.target.dataset.fieldName] = event.detail.recordId;
    }

    handleSaveCase() {
        if (!this.validateRequiredFields()) {
            return;
        }

        const recordTypeName = this.recordTypesMap[this.value];

        if (!recordTypeName) {
            console.log('RecordType => ' + recordTypeName);
            this.showError('Tipo de registro não encontrado.');
            return;
        }

        if (recordTypeName === 'Troca de Endereço de Instalação'){
            createAdress({params:this.buildObject()})
            .then(result => {
                this.showSuccess('Endereço criado salvo com sucesso');
                this.dispatchEvent(new RefreshEvent());
            })
            .catch(error => {
                console.error('Error creating Address:', JSON.stringify(error));
                this.showError('Erro ao criar Endereço: ' + error.body.message);
            });
        }

        createCase({ accountId: this.accountId, recordTypeName: recordTypeName })
            .then(result => {
                this.showSuccess('Case salvo com sucesso');
                this.dispatchEvent(new RefreshEvent());
            })
            .catch(error => {
                console.error('Error creating case:', JSON.stringify(error));
                this.showError('Erro ao criar caso: ' + error.body.message);
            });

            this.handleCase();
    }


    validateRequiredFields() {
        const recordTypeName = this.recordTypesMap[this.value];
        const requiredFieldsMap = {
            'Instalação de Antena': ['accountId',  'addressId'],
            'Visita Técnica': ['accountId', 'contactId', 'addressId'],
            'Troca de Endereço de Instalação': ['accountId', 'addressId', 'zipCode', 'street', 'city', 'state']
        };
    
        const ignoreFieldMap = {
            'Instalação de Antena': [],
            'Visita Técnica': ['contactId'],
            'Troca de Endereço de Instalação': []
        };
    
        const requiredFields = requiredFieldsMap[recordTypeName];
        let ignoreFields = ignoreFieldMap[recordTypeName] || [];
    
        let allFieldsFilled = true;
    
        const checkFields = (fields, ignoreFields) => {
            fields.forEach(field => {
                const fieldElement = this.template.querySelector(`[data-field-name="${field}"]`);
                if (!ignoreFields.includes(field) && (!this[field] || this[field] === '')) {
                    const fieldLabel = fieldElement ? fieldElement.getAttribute('data-field-label') : field;
                    this.showError(`O campo ${fieldLabel} é obrigatório.`);
                    allFieldsFilled = false;
                }
            });
        };
    
        if (requiredFields) {
            checkFields(requiredFields, ignoreFields);
        } else {
            this.showError('Tipo de registro não encontrado.');
            allFieldsFilled = false;
        }
    
        return allFieldsFilled;
    }
    
    

    buildObject(){
        return {
            accountId: this.accountId,
            city: this.city,
            street: this.street,
            zipCode: this.zipCode
        }
    }

    showSuccess(message) {
        this.dispatchEvent(new ShowToastEvent({
            title: 'Success',
            message: message,
            variant: 'success',
        }));
    }

    showError(message) {
        this.dispatchEvent(new ShowToastEvent({
            title: 'Error',
            message: message,
            variant: 'error',
        }));
    }

    get contactFilter() {
        return {
            criteria: [
                {
                    fieldPath: 'AccountId',
                    operator: 'eq',
                    value: this.accountId
                }
            ]
        }
    }
}
