/**
 * @author maylsonbruno
 */

public class AddressRepository {
  
    public List<Address__c> findByAddressAccount(String accountId){
    
         List<Address__c> address = [
            SELECT Id,Address__City__s, Address__Street__s, Address__PostalCode__s,RecordTypeId
             FROM Address__c
             WHERE Account__c = :accountId
             ORDER BY CreatedDate DESC

         ];
         
         return address != null ? address : null;
      
    }

    public List<RecordType> findByRecordType(String recordType){

        List<RecordType> recordTypes = [
            SELECT Id,Name
             FROM RecordType
             WHERE Name  = :recordType
         ];

         return recordTypes != null ? recordTypes : null;
    }
    
    public Id save ( Address__c address ) {

        upsert address;

        return address.Id;

    }
}