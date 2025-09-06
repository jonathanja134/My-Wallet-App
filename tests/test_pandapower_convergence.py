import pandapower as pp
import numpy as np

def test_pandapower_convergence():
    net = pp.create_empty_network(sn_mva=1.0)
    buses = [pp.create_bus(net, vn_kv=110, name=f"Bus {i+1}") for i in range(6)]
    pp.create_ext_grid(net, bus=buses[0], vm_pu=1.0, name="Slack")
    pp.create_gen(net, bus=buses[4], p_mw=0.220679, vm_pu=1.0, name="PV", slack=False)
    
    P_spec = np.array([0.0, 0.193, 0.23088947, 0.526679, 0.220679, 0.35121634])
    Q_spec = np.array([0.0, 0.095, 0.1724, 0.122217, 0.0, 0.13778287])
    
    for i in range(6):
        if i == 0:
            continue
        elif i == 4:
            if Q_spec[i] != 0:
                pp.create_shunt(net, bus=buses[i], q_mvar=Q_spec[i], p_mw=0.0)
        else:
            pp.create_load(net, bus=buses[i], p_mw=P_spec[i], q_mvar=Q_spec[i])
    
    pp.runpp(net, algorithm='nr', max_iteration=80)
    
    if net.converged:
        print("Power flow converged successfully.")
        assert net.res_bus["vm_pu"].isnull().sum() == 0
    else:
        print("Power flow did not converge.")
        assert False

test_pandapower_convergence()