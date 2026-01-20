from pudu.assembly import Protocol_from_sbol2
from pudu.utils import assembly_plan_RDF_to_JSON
from opentrons import protocol_api
from openpyxl import Workbook

assembly_JSON = assembly_plan_RDF_to_JSON('files/assembly_plan.xml')

# metadata
metadata = {
'protocolName': 'SBOL2 DNA assembly',
'author': 'Luke Dysart <luke.dysart@colorado.edu>',
'description': 'Automated DNA assembly from SBOL2 Assembly Plan',
'apiLevel': '2.13'}

def run(protocol= protocol_api.ProtocolContext):
    pudu_sbol2_assembly = Protocol_from_sbol2(assembly_JSON)
    pudu_sbol2_assembly.run(protocol)
    pudu_sbol2_assembly.get_xlsx_output('sbol2_assembly_output.xlsx')
