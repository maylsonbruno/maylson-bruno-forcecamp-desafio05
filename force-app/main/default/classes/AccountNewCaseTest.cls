/**
 * @author maylsonbruno
 */

@isTest
public class AccountNewCaseTest {

  private class GetAddressOutboundServiceMock implements HttpCalloutMock {

    public HttpResponse respond(HttpRequest req) {
      
      HttpResponse res = new HttpResponse();
      res.setHeader('Content-Type', 'application/json');
      res.setBody(
        '{"logradouro": "Test Street", "localidade": "Test City", "uf": "TS"}'
      );
      res.setStatusCode(200);
      return res;
    }
  }

  @testSetup
  public static void setup() {
   
    Account account = new Account(Name = 'Test Account');
    insert account;

    RecordType rt = [
      SELECT Id
      FROM RecordType
      WHERE SObjectType = 'Case'
      LIMIT 1
    ];

    Case caseRecord = new Case(
      AccountId = account.Id,
      RecordTypeId = rt.Id,
      Subject = 'Test Case',
      Status = 'New'
    );
    insert caseRecord;

    Address__c address = new Address__c(
      Account__c = account.Id,
      Address__City__s = 'Test City',
      Address__Street__s = 'Test Street',
      Address__PostalCode__s = '12345'
    );
    insert address;
  }

  @isTest
  public static void shouldFindAddressByZipCode() {

    Test.setMock(HttpCalloutMock.class, new GetAddressOutboundServiceMock());

    ZipCodeAddress address = AccountNewCaseController.findAddressByZipCode(
      '12345'
    );

    Assert.areEqual('12345', address.zipCode);
    Assert.areEqual('Test Street', address.street);
    Assert.areEqual('Test City', address.city);
    Assert.areEqual('TS', address.state);
  }

  @isTest
  public static void shouldGetCaseRecordTypes() {

    List<Map<String, String>> recordTypes = AccountNewCaseController.getCaseRecordTypes();

    System.assert(!recordTypes.isEmpty(), 'Record types should not be empty');
    for (Map<String, String> rt : recordTypes) {
      Assert.areNotEqual('Master', rt.get('developerName'));
    }
  }

  @isTest
  public static void shouldCreateCase() {

    Account account = [SELECT Id FROM Account LIMIT 1];
    List<Map<String, String>> recordTypes = AccountNewCaseController.getCaseRecordTypes();
    String recordTypeName = recordTypes[0].get('developerName');

    Id caseId = AccountNewCaseController.createCase(account.Id, recordTypeName);

    Case createdCase = [
      SELECT Id, AccountId, Subject
      FROM Case
      WHERE Id = :caseId
    ];
    Assert.areEqual(account.Id, createdCase.AccountId);
    Assert.areEqual(recordTypeName.replace('_', ' '), createdCase.Subject);
  }

  @isTest
  public static void shouldCreateAddress() {

    Map<String, Object> params = new Map<String, Object>();
    params.put('accountId', '001xxxxxxxxxxxxxxx');
    params.put('city', 'Test City');
    params.put('street', 'Test Street');
    params.put('zipCode', '12345');

    Id addressId = AccountNewCaseController.createAdress(params);

    Address__c createdAddress = [
      SELECT Id, Address__City__s, Address__Street__s, Address__PostalCode__s
      FROM Address__c
      WHERE Id = :addressId
    ];
    Assert.areEqual('Test City', createdAddress.Address__City__s);
    Assert.areEqual('Test Street', createdAddress.Address__Street__s);
    Assert.areEqual('12345', createdAddress.Address__PostalCode__s);
  }

  @isTest
  public static void shouldFindByAddressAccount() {
    
    Account account = [SELECT Id FROM Account LIMIT 1];
    List<Address__c> addresses = AccountNewCaseController.findByAddressAccount(
      account.Id
    );

    Assert.areNotEqual(0, addresses.size(), 'Address list should not be empty');
    Assert.areEqual(account.Id, addresses[0].Account__c);
  }
}
