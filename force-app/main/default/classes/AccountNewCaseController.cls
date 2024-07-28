/**
 * @author maylsonbruno
 */

public class AccountNewCaseController {

    static AddressRepository repository;
    static GetAddressOutboundService service;

    static {
        repository = new AddressRepository();
        service = new GetAddressOutboundService();
    }

     
    @AuraEnabled
    public static ZipCodeAddress findAddressByZipCode(String zipCode){

       GetAddressResponse response = service.getAdress(zipCode);

            ZipCodeAddress address =  new ZipCodeAddress();
            address.zipCode = zipCode;
            address.street = response.logradouro;
            address.city = response.localidade;
            address.state = response.uf;

            return address;

    }


    @AuraEnabled(cacheable=true)
    public static List<Map<String, String>> getCaseRecordTypes() {
        List<Map<String, String>> recordTypeList = new List<Map<String, String>>();

        Map<String, RecordTypeInfo> recordTypes = Case.SObjectType.getDescribe().getRecordTypeInfosByDeveloperName();

        for (String developerName : recordTypes.keySet()) {
            RecordTypeInfo rtInfo = recordTypes.get(developerName);
            if (rtInfo.isAvailable() && !rtInfo.isMaster()) { 
                Map<String, String> recordTypeMap = new Map<String, String>();
                recordTypeMap.put('id', rtInfo.getRecordTypeId()); 
                recordTypeMap.put('developerName', developerName);
                recordTypeMap.put('label', rtInfo.getName());
                recordTypeList.add(recordTypeMap);
            }
        }

        return recordTypeList;
    }
    
    @AuraEnabled
    public static Id createCase(Id accountId, String recordTypeName) {

        try {

            List<RecordType> recordTypes = repository.findByRecordType(recordTypeName);
            
             RecordType recordType = recordTypes[0];

           
             Case caseRecord = new Case(
                 RecordTypeId = recordType.Id,
                 AccountId = accountId,
                 Subject = recordTypeName.replace('_', ' '),
                 Status = 'New'
             );
            
             insert caseRecord;
            return caseRecord.Id;

        } catch (Exception e) {

            throw new AuraHandledException('Error creating case: ' + e.getMessage());
        }

    }

    @AuraEnabled
    public static Id createAdress(Map<String,Object> params){

          Address__c address = new Address__c();

        try {
            
            address.Account__c = (String) params.get('accountId');
            address.Address__City__s = (String) params.get('city');
            address.Address__Street__s = (String) params.get('street');
            address.Address__PostalCode__s = (String) params.get('zipCode');
            
            upsert address;
            return address.Id;
            
        } catch (Exception e) {

            throw new AuraHandledException(e.getMessage());
        }
    }
  

    @AuraEnabled
    public static List<Address__c> findByAddressAccount(String accountId){

        List<Address__c> address = repository.findByAddressAccount(accountId);
        return address;

    }
}
